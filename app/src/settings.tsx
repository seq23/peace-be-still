// The one place the person's choices live: read once from the phone, saved on every change, shared by
// every screen through context. A read failure is a hard stop (it must never reset an age restriction).
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { deviceLanguage } from './i18n/device';
import { t as translate, type Key } from './i18n';
import { initial, journeyLanguage, migrateSettings, type Language, type Settings } from './model';

export const STORAGE_KEY = 'peace-be-still-settings';

type State = {
  settings: Settings;
  ready: boolean;
  readFailed: boolean;
  saveFailed: boolean;
  save: (next: Settings) => void;
};

const Context = createContext<State | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(initial);
  const [ready, setReady] = useState(false);
  const [readFailed, setReadFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then(value => {
        if (!live) return;
        const next = value ? migrateSettings(JSON.parse(value)) : { ...initial, language: deviceLanguage() };
        setSettings(next);
        // A record from an older build is rewritten once in the new shape.
        if (value && JSON.stringify(next) !== value) void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      })
      .catch(() => { if (live) setReadFailed(true); })
      .finally(() => { if (live) setReady(true); });
    return () => { live = false; };
  }, []);

  const save = useCallback((next: Settings) => {
    setSettings(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).then(() => setSaveFailed(false), () => setSaveFailed(true));
  }, []);

  const value = useMemo(() => ({ settings, ready, readFailed, saveFailed, save }), [settings, ready, readFailed, saveFailed, save]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useSettings(): State {
  const state = useContext(Context);
  if (!state) throw new Error('useSettings outside SettingsProvider');
  return state;
}

/**
 * Strings in the right language. 'app' screens (onboarding, Settings) follow the app language; 'journey'
 * screens (the tabs) follow the chosen journey's language, so Mi Refugio is Spanish inside.
 */
export function useT(scope: 'app' | 'journey' = 'app') {
  const { settings } = useSettings();
  const locale: Language = scope === 'journey' ? journeyLanguage(settings) : settings.language;
  return useMemo(() => {
    const t = (key: Key, values: Record<string, string | number> = {}) => translate(key, { ...values, locale });
    t.locale = locale;
    return t;
  }, [locale]);
}
