import type { ExpoConfig } from 'expo/config';

const testStore = process.env.REVENUECAT_PBS_TEST_STORE === '1';
const iosKey = testStore ? process.env.REVENUECAT_PBS_TEST_PUBLIC_KEY : process.env.REVENUECAT_PBS_IOS_PUBLIC_KEY;
const androidKey = testStore ? process.env.REVENUECAT_PBS_TEST_PUBLIC_KEY : process.env.REVENUECAT_PBS_ANDROID_PUBLIC_KEY;

/** Store builds for Google Play (eas.json profiles `production` and `internal`) must carry RevenueCat's Play key
 *  (goog_…): without it the price screen could not buy, and a wrong key would talk to the wrong store. Returns the
 *  named stop, or null. A test-store key is never allowed in a Play build. */
export function androidStoreKeyStop(env: Record<string, string | undefined>): string | null {
  if (env.EAS_BUILD_PLATFORM !== 'android' || !['production', 'internal'].includes(env.EAS_BUILD_PROFILE ?? '')) return null;
  if (env.REVENUECAT_PBS_TEST_STORE === '1') return 'REVENUECAT_TEST_STORE_IN_PLAY_BUILD: unset REVENUECAT_PBS_TEST_STORE for a Play build';
  if (!/^goog_[A-Za-z0-9]{8,}$/.test(env.REVENUECAT_PBS_ANDROID_PUBLIC_KEY ?? '')) {
    return 'REVENUECAT_PBS_ANDROID_KEY_MISSING: REVENUECAT_PBS_ANDROID_PUBLIC_KEY must be the RevenueCat Play key (goog_…)';
  }
  return null;
}
const stop = androidStoreKeyStop(process.env);
if (stop) throw new Error(stop);

const config: ExpoConfig = {
  name: 'Peace Be Still', slug: 'peace-be-still', scheme: 'peacebestill', version: '1.0.0',
  orientation: 'portrait', userInterfaceStyle: 'automatic', plugins: [
    // One web bundle: the app is small, and lazy route chunks showed a blank screen while a slow phone fetched them.
    ['expo-router', { asyncRoutes: { web: false, default: 'development' } }],
    // Playback only: no microphone on Android (voice recording is not in v1).
    ['expo-audio', { enableBackgroundPlayback: true, recordAudioAndroid: false }],
    ['expo-splash-screen', { image: './assets/icon.png', resizeMode: 'contain', backgroundColor: '#0E1A22' }],
    // Local notifications only (the one daily reminder): no push entitlement, no server, no token.
    ['expo-notifications', { enableRemoteNotifications: false }]],
  icon: './assets/icon.png',
  // Only HTTPS and Apple's own encryption: exempt, so no export-compliance question on each upload.
  ios: { bundleIdentifier: 'com.peacebestillapp.mobile', infoPlist: { ITSAppUsesNonExemptEncryption: false } },
  android: {
    package: 'com.peacebestillapp.mobile',
    // The dark tile: the approved mark (assets/brand/pbs-mark-dark.svg, rendered with resvg: docs/OPERATIONS.md) on the night colour.
    adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#0E1A22' },
    // Nothing in the app records, writes shared storage or draws over other apps. The Play Data safety answers
    // and the privacy policy rely on these staying out (the store build workflow checks the AAB's manifest).
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'com.google.android.gms.permission.AD_ID',
    ],
  },
  web: { bundler: 'metro' },
  // EAS project @seq23/peace-be-still (eas init); the submit profile is in eas.json.
  owner: 'seq23',
  // The ONE audio host: R2 bucket peace-be-still-audio (key = manifest `file`, audio/publish.py). PBS_AUDIO_BASE_URL overrides.
  extra: {
    revenueCatIosKey: iosKey,
    revenueCatAndroidKey: androidKey,
    audioBaseUrl: process.env.PBS_AUDIO_BASE_URL ?? 'https://pbs-audio.professionalresourcelibrary.com/',
    eas: { projectId: 'e23117dc-4272-4aaa-b88e-662733141a5c' } },
};
export default config;
