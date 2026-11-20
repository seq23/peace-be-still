import type { ExpoConfig } from 'expo/config';
const config: ExpoConfig = {
  name: 'Peace Be Still', slug: 'peace-be-still', scheme: 'peacebestill', version: '1.0.0',
  orientation: 'portrait', userInterfaceStyle: 'automatic', plugins: ['expo-router', ['expo-splash-screen', { image: './assets/icon.png', resizeMode: 'contain', backgroundColor: '#0E1A22' }]],
  icon: './assets/icon.png',
  ios: { bundleIdentifier: 'com.peacebestillapp.mobile' },
  android: { package: 'com.peacebestillapp.mobile' },
  web: { bundler: 'metro' },
};
export default config;
