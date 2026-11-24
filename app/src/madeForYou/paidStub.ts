// Made for you is a paid feature: open only to a paid plan (the store, or the web preview's own ?paid=1 switch in
// purchases/provider.tsx), 13 and over. The web preview is NOT paid by itself: it uses fake sessions
// (previewApi), but who gets in follows the same paid flag as every other paid screen.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Age } from '../model';
import { useOffline } from '../screens/listen/offline';

export const isMadeForYouPreview = () => Platform.OS === 'web' && process.env.EXPO_PUBLIC_PBS_PREVIEW === '1';

export function useMadeForYouPaid(age: Age | null) {
  const { paid } = useOffline(age);
  return !!age && age !== 'child' && !!paid;
}

export async function madeForYouToken(age: Age): Promise<string> {
  if (age === 'child') throw new Error('Install unavailable');
  const saved: { age?: Age; token?: string } | null = JSON.parse(
    (await AsyncStorage.getItem('peace-be-still-chat-token')) ?? 'null',
  );
  if (saved?.age !== age || !saved.token) throw new Error('Install unavailable');
  return saved.token;
}
