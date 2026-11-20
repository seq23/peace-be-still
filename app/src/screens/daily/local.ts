import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

export function localRecord<T>(key: string, initial: T) {
  let state = { value: initial, ready: false, failed: false };
  let pending = Promise.resolve();
  let loaded: Promise<void> | undefined;
  const listeners = new Set<() => void>();
  const publish = (next: typeof state) => {
    state = next;
    listeners.forEach(listener => listener());
  };
  const load = () => loaded ??= AsyncStorage.getItem(key).then(raw => {
    publish({ value: raw ? JSON.parse(raw) : initial, ready: true, failed: false });
  }).catch(() => {
    publish({ ...state, failed: true });
    loaded = undefined;
  });
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  };
  return {
    useRecord() {
      const snapshot = useSyncExternalStore(subscribe, () => state);
      useEffect(() => { void load(); }, []);
      return { ...snapshot, retry: load };
    },
    update(change: (value: T) => T) {
      const write = pending.then(async () => {
        await load();
        if (!state.ready) throw new Error('Local record unavailable');
        const value = change(state.value);
        await AsyncStorage.setItem(key, JSON.stringify(value));
        publish({ value, ready: true, failed: false });
      });
      pending = write.catch(() => { publish({ ...state, failed: true }); });
      return pending;
    },
  };
}
