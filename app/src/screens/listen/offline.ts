import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { canUse, type User } from '../../gates';
import products from '../../config/products.json';
import { createDownloads } from '../../player/downloads';
import { expoDownloadFiles } from '../../player/adapters';
import type { Track } from '../../player/library';

export function useOffline(age: User['age']): User {
  const [paid, setPaid] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    let live = true;
    let unsubscribe: (() => void) | undefined;
    void (async () => {
      const { default: purchases } = await import('react-native-purchases');
      if (!(await purchases.isConfigured()) || !live) return;
      let refreshed = false;
      const update: Parameters<typeof purchases.addCustomerInfoUpdateListener>[0] = info => {
        if (live) setPaid(!!info.entitlements.active[products.entitlement]);
      };
      const onChange: typeof update = info => { refreshed = true; update(info); };
      purchases.addCustomerInfoUpdateListener(onChange);
      unsubscribe = () => { purchases.removeCustomerInfoUpdateListener(onChange); };
      const info = await purchases.getCustomerInfo();
      if (!refreshed) update(info);
    })().catch(() => undefined);
    return () => { live = false; unsubscribe?.(); };
  }, []);
  return { age, paid };
}

export function downloadAvailable(track: Track, user: User): boolean {
  if (!canUse('offline', user)) return false;
  try {
    return !!createDownloads(expoDownloadFiles()).find(track);
  } catch {
    return false;
  }
}
