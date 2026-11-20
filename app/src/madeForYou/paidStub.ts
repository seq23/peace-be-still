// Integration: replace this hook with usePurchases().paid and bind request auth to
// phase 3's install-token helper (including renewal). The paywall route comes from 5S.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Age } from '../model';
import { useOffline } from '../screens/listen/offline';

export const isMadeForYouPreview = () => Platform.OS === 'web' && process.env.EXPO_PUBLIC_PBS_PREVIEW === '1';

export function useMadeForYouPaid(age: Age | null) {
  const { paid } = useOffline(age);
  return !!age && age !== 'child' && (isMadeForYouPreview() || !!paid);
}

export async function madeForYouToken(age: Age): Promise<string> {
  if (age === 'child') throw new Error('Install unavailable');
  const saved: { age?: Age; token?: string } | null = JSON.parse(
    (await AsyncStorage.getItem('peace-be-still-chat-token')) ?? 'null',
  );
  if (saved?.age !== age || !saved.token) throw new Error('Install unavailable');
  return saved.token;
}
