// The app's one set of strings (expo-localization + i18n-js). Every word a person sees lives in en.json and
// es.json under a named key, so the copy checks judge exactly what is shown. `Key` is typed from en.json: a
// missing key is a type error, never a raw key on screen. A key may hold %{name} values and one/other plurals.
// The phone's language (./device) picks the start language; Settings (or Mi Refugio) passes `locale` per call.
import { I18n, type TranslateOptions } from 'i18n-js';
import en from './en.json';
import es from './es.json';

export type Language = 'en' | 'es';
export type Key = keyof typeof en;

export const strings = { en, es } as const;

export const i18n = new I18n(strings, {
  defaultLocale: 'en',
  enableFallback: true,
  // Keys are flat ("door.title"), so nothing is split on '.'.
  defaultSeparator: '\u0000',
});

/** 'es' for any Spanish locale tag (es, es-MX, es_419), otherwise 'en'. */
export function languageOf(tag: string | null | undefined): Language {
  return /^es(?:[-_]|$)/i.test(tag ?? '') ? 'es' : 'en';
}

export function setLanguage(language: Language) {
  i18n.locale = language;
}

export function t(key: Key, options?: TranslateOptions & { locale?: string }): string {
  return i18n.t(key, options);
}
