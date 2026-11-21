import type { ExpoConfig } from 'expo/config';
const config: ExpoConfig = {
  name: 'Peace Be Still', slug: 'peace-be-still', scheme: 'peacebestill', version: '1.0.0',
  orientation: 'portrait', userInterfaceStyle: 'automatic', plugins: [
    // One web bundle: the app is small, and lazy route chunks showed a blank screen while a slow phone fetched them.
    ['expo-router', { asyncRoutes: { web: false, default: 'development' } }], ['expo-audio', { enableBackgroundPlayback: true }], ['expo-splash-screen', { image: './assets/icon.png', resizeMode: 'contain', backgroundColor: '#0E1A22' }],
    // Local notifications only (the one daily reminder): no push entitlement, no server, no token.
    ['expo-notifications', { enableRemoteNotifications: false }]],
  icon: './assets/icon.png',
  // Only HTTPS and Apple's own encryption: exempt, so no export-compliance question on each upload.
  ios: { bundleIdentifier: 'com.peacebestillapp.mobile', infoPlist: { ITSAppUsesNonExemptEncryption: false } },
  android: { package: 'com.peacebestillapp.mobile' },
  web: { bundler: 'metro' },
  // The ONE audio host: R2 bucket peace-be-still-audio (key = manifest `file`, audio/publish.py). PBS_AUDIO_BASE_URL overrides.
  extra: {
    revenueCatIosKey: process.env.REVENUECAT_PBS_TEST_STORE === '1'
      ? process.env.REVENUECAT_PBS_TEST_PUBLIC_KEY
      : process.env.REVENUECAT_PBS_IOS_PUBLIC_KEY,
    audioBaseUrl: process.env.PBS_AUDIO_BASE_URL ?? 'https://pbs-audio.professionalresourcelibrary.com/' },
};
export default config;
