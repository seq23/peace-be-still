// The iPhone's Apple DeviceCheck token (modules/device-check), sent once when the Chat tab asks whether
// this is the private first chat. Web, Android, a simulator, or any error: null (the normal free lane).
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

type Native = { token(): Promise<string | null> };

export async function deviceCheckToken(): Promise<string | null> {
  if (Platform.OS !== 'ios') return null;
  try {
    const native = requireOptionalNativeModule<Native>('PBSDeviceCheck');
    return native ? ((await native.token()) ?? null) : null;
  } catch {
    return null;
  }
}
