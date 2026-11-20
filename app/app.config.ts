import type { ExpoConfig } from 'expo/config';
const config: ExpoConfig = {
  name: 'Peace Be Still', slug: 'peace-be-still', scheme: 'peacebestill', version: '1.0.0',
  orientation: 'portrait', userInterfaceStyle: 'automatic', plugins: ['expo-router', ['expo-audio', { enableBackgroundPlayback: true }], ['expo-splash-screen', { image: './assets/icon.png', resizeMode: 'contain', backgroundColor: '#0E1A22' }]],
  icon: './assets/icon.png',
  ios: { bundleIdentifier: 'com.peacebestillapp.mobile' },
  android: { package: 'com.peacebestillapp.mobile' },
  web: { bundler: 'metro' },
  // The ONE audio host: R2 bucket peace-be-still-audio (key = manifest `file`, audio/publish.py). PBS_AUDIO_BASE_URL overrides.
  extra: { audioBaseUrl: process.env.PBS_AUDIO_BASE_URL ?? 'https://audio.peacebestillapp.com/' },
};
export default config;
