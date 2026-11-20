import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type Purchases from 'react-native-purchases';
import type { CustomerInfo, PurchasesOfferings, PurchasesPackage } from 'react-native-purchases';
import products from '../config/products.json';

export type Store = Pick<typeof Purchases,
  'getOfferings' | 'getCustomerInfo' | 'getAppUserID' | 'logIn' | 'purchasePackage' |
  'restorePurchases' | 'addCustomerInfoUpdateListener' | 'removeCustomerInfoUpdateListener'>;
export type Plan = 'yearly' | 'monthly';

export function hasPaid(info: CustomerInfo): boolean {
  return !!info.entitlements.active[products.entitlement]?.isActive;
}

export function plansFrom({ current }: PurchasesOfferings) {
  if (current?.identifier !== products.offering) return null;
  const find = (plan: Plan, identifier: string, period: string) => current.availablePackages.find(pkg =>
    pkg.identifier === identifier && pkg.product.identifier === products.products[plan].id &&
    pkg.product.subscriptionPeriod === period && !pkg.product.introPrice && !!pkg.product.priceString);
  const yearly = find('yearly', '$rc_annual', 'P1Y');
  const monthly = find('monthly', '$rc_monthly', 'P1M');
  return yearly && monthly ? { yearly, monthly } : null;
}

type Outcome = 'active' | 'unconfirmed' | 'pending' | 'cancelled' | 'failed';
export type PurchaseStore = Store & {
  buy: (pkg: PurchasesPackage) => Promise<{ outcome: Outcome; info?: CustomerInfo }>;
};

let connection: Promise<PurchaseStore | null> | undefined;

export function connectStore() {
  const key = Constants.expoConfig?.extra?.revenueCatIosKey;
  if (Platform.OS !== 'ios' || typeof key !== 'string' || !key) return Promise.resolve(null);
  return connection ??= openStore(key).catch(error => {
    connection = undefined;
    throw error;
  });
}

async function openStore(apiKey: string): Promise<PurchaseStore> {
  const { default: sdk, PURCHASES_ERROR_CODE } = await import('react-native-purchases');
  sdk.configure({ apiKey, diagnosticsEnabled: false, automaticDeviceIdentifierCollectionEnabled: false });
  return Object.assign(Object.create(sdk) as Store, {
    async buy(pkg: PurchasesPackage): Promise<{ outcome: Outcome; info?: CustomerInfo }> {
      try {
        const { customerInfo: info } = await sdk.purchasePackage(pkg);
        return { outcome: hasPaid(info) ? 'active' : 'unconfirmed', info };
      } catch (error) {
        const { code, userCancelled } = (error ?? {}) as { code?: string; userCancelled?: boolean };
        if (code === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) return { outcome: 'pending' };
        if (userCancelled || code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return { outcome: 'cancelled' };
        return { outcome: 'failed' };
      }
    },
  });
}
