import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import { installId, redeemReviewCode, type ReviewResult } from '../chat/api';
import { canUse, type Feature, type User } from '../gates';
import { useSettings } from '../settings';
import { connectStore, hasPaid, previewStore, type PurchaseStore } from './revenuecat';

type Status = 'idle' | 'buying' | 'restoring' | 'pending' | 'failed' | 'unconfirmed' | 'nothingToRestore' | 'restoreFailed';
type State = {
  store: PurchaseStore | null;
  preview: typeof previewStore | null;
  paid: boolean;
  /** False until the store has answered once (or there is no store to ask): screens that lock wait for it. */
  known: boolean;
  status: Status;
  buy: (pkg: PurchasesPackage) => Promise<void>;
  restore: () => Promise<void>;
  /** A store reviewer's code (worker/src/review.ts). Paid only once RevenueCat itself reports the grant. */
  redeem: (code: string) => Promise<ReviewResult>;
};
const Context = createContext<State | null>(null);

/**
 * The CI web preview's paid switch, so reviewers and the store screenshots can see the paid screens.
 * `?paid=1` turns it on (remembered in this browser as `pbs-preview-paid`), `?paid=0` turns it off. It is read
 * only when the build is the web preview (EXPO_PUBLIC_PBS_PREVIEW=1 on web); a phone or store build never reads it.
 */
export const PREVIEW_PAID_KEY = 'pbs-preview-paid';
function previewPaid(): boolean {
  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    const asked = new URLSearchParams((globalThis as { location?: Location }).location?.search ?? '').get('paid');
    if (asked === '1') storage?.setItem(PREVIEW_PAID_KEY, '1');
    if (asked === '0') storage?.removeItem(PREVIEW_PAID_KEY);
    return storage?.getItem(PREVIEW_PAID_KEY) === '1';
  } catch {
    return false;
  }
}

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const { settings: { age } } = useSettings();
  const preview = Platform.OS === 'web' && process.env.EXPO_PUBLIC_PBS_PREVIEW === '1' ? previewStore : null;
  const [store, setStore] = useState<PurchaseStore | null>(null);
  const [paid, setPaid] = useState(() => !!preview && previewPaid());
  const [answered, setAnswered] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const inFlight = useRef(false);
  const pending = useRef(false);

  useEffect(() => {
    if (preview || !age || age === 'child') return;
    let live = true;
    let cleanup = () => {};
    void connectStore().then(async sdk => {
      if (!sdk || !live) { if (live) setAnswered(true); return; }
      const update = (info: CustomerInfo) => {
        if (!live) return;
        const active = hasPaid(info);
        setPaid(active);
        setAnswered(true);
        if (active) {
          pending.current = false;
          setStatus(current => current === 'pending' ? 'idle' : current);
        }
      };
      const refresh = () => {
        if (!inFlight.current) void sdk.getCustomerInfo().then(info => {
          if (!inFlight.current) update(info);
        }).catch(() => {
          // No answer and nothing cached (a first launch offline): go on as the free lane rather than wait forever.
          if (live) setAnswered(true);
        });
      };
      const id = await installId();
      if (id && await sdk.getAppUserID() !== id) await sdk.logIn(id);
      if (!live) return;
      sdk.addCustomerInfoUpdateListener(update);
      const subscription = AppState.addEventListener('change', state => {
        if (state === 'active') refresh();
      });
      cleanup = () => {
        sdk.removeCustomerInfoUpdateListener(update);
        subscription.remove();
      };
      setStore(sdk);
      refresh();
    }).catch(() => { if (live) { setStatus('failed'); setAnswered(true); } });
    return () => { live = false; cleanup(); };
  }, [age, preview]);

  async function transact(pkg?: PurchasesPackage) {
    if (!store || !age || age === 'child' || inFlight.current || (pkg && (paid || pending.current))) return;
    inFlight.current = true;
    setStatus(pkg ? 'buying' : 'restoring');
    try {
      const id = await installId(age);
      if (!id) throw new Error('Install identity unavailable');
      if (await store.getAppUserID() !== id) {
        const { customerInfo } = await store.logIn(id);
        setPaid(hasPaid(customerInfo));
        if (pkg && hasPaid(customerInfo)) {
          setStatus('idle');
          return;
        }
      }
      if (pkg) {
        const { outcome, info } = await store.buy(pkg);
        if (info) setPaid(hasPaid(info));
        pending.current = outcome === 'pending';
        setStatus(outcome === 'active' || outcome === 'cancelled' ? 'idle' : outcome);
      } else {
        const active = hasPaid(await store.restorePurchases());
        setPaid(active);
        if (active) pending.current = false;
        setStatus(active ? 'idle' : pending.current ? 'pending' : 'nothingToRestore');
      }
    } catch {
      setStatus(pending.current ? 'pending' : pkg ? 'failed' : 'restoreFailed');
    } finally {
      inFlight.current = false;
    }
  }

  async function redeem(code: string): Promise<ReviewResult> {
    if (!store || !age || age === 'child') return 'failed';
    try {
      // The grant goes to the install id, so the store must be logged in as it first (as at checkout).
      const id = await installId(age);
      if (!id) return 'failed';
      if (await store.getAppUserID() !== id) await store.logIn(id);
      const result = await redeemReviewCode(age, code);
      if (result !== 'granted') return result;
      await store.invalidateCustomerInfoCache();
      const active = hasPaid(await store.getCustomerInfo());
      setPaid(active);
      return active ? 'granted' : 'failed';
    } catch {
      return 'failed';
    }
  }

  const allowed = !!age && age !== 'child';
  return <Context.Provider value={{ store: allowed ? store : null, preview: allowed ? preview : null, paid: allowed && paid, known: !allowed || !!preview || answered, status, buy: transact, restore: transact, redeem }}>{children}</Context.Provider>;
}

export function usePurchases() {
  const value = useContext(Context);
  if (!value) throw new Error('PurchasesProvider is required');
  return value;
}

/** Bind the existing gates to the same entitlement all screens observe. */
export function useCanUse() {
  const { paid } = usePurchases();
  const { settings: { age } } = useSettings();
  return (feature: Feature, usage: Omit<User, 'paid' | 'age'> = {}) => canUse(feature, { ...usage, paid, age });
}
