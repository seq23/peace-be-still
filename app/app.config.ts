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
/** An over-the-air update (PBS_OTA_UPDATE=1, set only by scripts/ota-update.sh) replaces the JS bundle on every
 *  phone of that version, purchase keys included: a bundle without BOTH store keys would leave live users unable to
 *  buy or restore. Returns the named stop, or null. */
export function otaKeyStop(env: Record<string, string | undefined>): string | null {
  if (env.PBS_OTA_UPDATE !== '1') return null;
  if (env.REVENUECAT_PBS_TEST_STORE === '1') return 'REVENUECAT_TEST_STORE_IN_OTA: unset REVENUECAT_PBS_TEST_STORE for an update';
  if (!/^appl_[A-Za-z0-9]{8,}$/.test(env.REVENUECAT_PBS_IOS_PUBLIC_KEY ?? '')) return 'REVENUECAT_PBS_IOS_KEY_MISSING_FOR_OTA: run through the vault (REVENUECAT_PBS_IOS_PUBLIC_KEY, appl_…)';
  if (!/^goog_[A-Za-z0-9]{8,}$/.test(env.REVENUECAT_PBS_ANDROID_PUBLIC_KEY ?? '')) return 'REVENUECAT_PBS_ANDROID_KEY_MISSING_FOR_OTA: run through the vault (REVENUECAT_PBS_ANDROID_PUBLIC_KEY, goog_…)';
  return null;
}

const stop = androidStoreKeyStop(process.env) ?? otaKeyStop(process.env);
if (stop) throw new Error(stop);

const PROJECT_ID = 'e23117dc-4272-4aaa-b88e-662733141a5c';

/** The iPhone's microphone question, in every app language (./locales/<lang>.json carries each one but English;
 *  test/i18n.unit.ts checks each file says exactly this). */
export const MICROPHONE = {
  en: 'Peace Be Still uses the microphone only when you record your moment for Write your own night. The recording stays on this phone and is never uploaded.',
  es: 'Peace Be Still usa el micrófono solo cuando grabas tu momento para Escribe tu propia noche. La grabación se queda en este teléfono y nunca se sube.',
  ko: 'Peace Be Still은 나만의 밤 쓰기에서 나의 순간을 녹음할 때만 마이크를 사용해요. 녹음은 이 휴대폰에 남고 절대 업로드되지 않아요.',
  'zh-Hans': 'Peace Be Still 只在你为“写下你自己的夜晚”录下你的片刻时使用麦克风。录音留在这部手机上，永远不会上传。',
  'zh-Hant': 'Peace Be Still 只在你為「寫下你自己的夜晚」錄下你的片刻時使用麥克風。錄音留在這支手機上，永遠不會上傳。',
} as const;

const config: ExpoConfig = {
  name: 'Peace Be Still', slug: 'peace-be-still', scheme: 'peacebestill', version: '1.0.1',
  orientation: 'portrait', userInterfaceStyle: 'automatic', plugins: [
    // One web bundle: the app is small, and lazy route chunks showed a blank screen while a slow phone fetched them.
    ['expo-router', { asyncRoutes: { web: false, default: 'development' } }],
    // Write your own night records her moment on iPhone only (kept on the phone, never uploaded); Android stays
    // playback only (RECORD_AUDIO blocked below), so the Play Data safety answers do not change.
    ['expo-audio', { enableBackgroundPlayback: true, recordAudioAndroid: false, microphonePermission: MICROPHONE.en }],
    ['expo-splash-screen', { image: './assets/icon.png', resizeMode: 'contain', backgroundColor: '#0E1A22' }],
    // Local notifications only (the one daily reminder): no push entitlement, no server, no token.
    ['expo-notifications', { enableRemoteNotifications: false }],
    'expo-updates',
    // Write your own night's folder stays out of Google backup and device transfer (the iPhone marks it at run time).
    './plugins/own-night-backup',
    // Gradle gets enough Metaspace for the release build (from 24 Nov 2026 it hung out of memory until the timeout).
    './plugins/gradle-memory'],
  // Over-the-air fixes (EAS Update, free tier): a phone checks at launch and uses a new JS bundle on the next
  // launch. An update only reaches builds of the SAME app version (runtimeVersion = appVersion), so a native change
  // ships as a new store version, never over the air. Publish only with scripts/ota-update.sh (it refuses a bundle
  // without both purchase keys). Builds from 1.0.1 on; 1.0.0 has no updater.
  runtimeVersion: { policy: 'appVersion' },
  updates: { url: `https://u.expo.dev/${PROJECT_ID}`, checkAutomatically: 'ON_LOAD', fallbackToCacheTimeout: 0 },
  icon: './assets/icon.png',
  // Only HTTPS and Apple's own encryption: exempt, so no export-compliance question on each upload.
  ios: { bundleIdentifier: 'com.peacebestillapp.mobile', infoPlist: { ITSAppUsesNonExemptEncryption: false, CFBundleAllowMixedLocalizations: true } },
  // The Spanish Info.plist strings (the microphone question), so a Spanish iPhone asks in Spanish.
  locales: { es: './locales/es.json', ko: './locales/ko.json', 'zh-Hans': './locales/zh-Hans.json', 'zh-Hant': './locales/zh-Hant.json' },
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
    eas: { projectId: PROJECT_ID } },
};
export default config;
