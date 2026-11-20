import { Platform } from 'react-native';

/** Configure the native SDK only when a public platform key is supplied.
 * Offerings, purchases and entitlements are intentionally deferred to Phase 5. */
export async function configureRevenueCat(): Promise<'configured' | 'unavailable'> {
  const key = Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : Platform.OS === 'android' ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY : undefined;
  if (!key) return 'unavailable';
  const { default: Purchases } = await import('react-native-purchases');
  Purchases.configure({ apiKey: key, diagnosticsEnabled: false, automaticDeviceIdentifierCollectionEnabled: false });
  return 'configured';
}
