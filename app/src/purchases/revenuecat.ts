import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type Purchases from 'react-native-purchases';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import products from '../config/products.json';

export type Store = Pick<typeof Purchases,
  'getOfferings' | 'getCustomerInfo' | 'getAppUserID' | 'logIn' | 'purchasePackage' |
  'restorePurchases' | 'addCustomerInfoUpdateListener' | 'removeCustomerInfoUpdateListener'>;
export type Plan = 'yearly' | 'monthly';

export function hasPaid(info: CustomerInfo): boolean {
  return !!info.entitlements.active[products.entitlement]?.isActive;
}

type PlanPackage = Pick<PurchasesPackage, 'identifier'> & {
  product: Pick<PurchasesPackage['product'], 'identifier' | 'subscriptionPeriod' | 'introPrice' | 'priceString' | 'pricePerMonthString'>;
};

export function plansFrom<T extends PlanPackage>({ current }: {
  current: { identifier: string; availablePackages: T[] } | null;
}) {
  if (current?.identifier !== products.offering) return null;
  const find = (plan: Plan, identifier: string, period: string) => current.availablePackages.find(pkg =>
    pkg.identifier === identifier && pkg.product.identifier === products.products[plan].id &&
    pkg.product.subscriptionPeriod === period && !pkg.product.introPrice && !!pkg.product.priceString);
  const yearly = find('yearly', '$rc_annual', 'P1Y');
  const monthly = find('monthly', '$rc_monthly', 'P1M');
  return yearly && monthly ? { yearly, monthly } : null;
}

// The read-only storefront double used by the web preview. It has no checkout or account API.
export const previewStore = {
  async getOfferings() {
    const dollars = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
    const availablePackages = (['yearly', 'monthly'] as const).map(plan => {
      const product = products.products[plan];
      const price = Number(product.usPrice);
      const annual = plan === 'yearly';
      return {
        identifier: annual ? '$rc_annual' : '$rc_monthly',
        product: {
          identifier: product.id,
          subscriptionPeriod: annual ? 'P1Y' : 'P1M',
          introPrice: null,
          priceString: dollars.format(price),
          pricePerMonthString: annual ? dollars.format(price / 12) : null,
        },
      };
    });
    return { current: { identifier: products.offering, availablePackages } };
  },
};

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
