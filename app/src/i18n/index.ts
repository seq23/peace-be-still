// The app's one set of strings (expo-localization + i18n-js). Every word a person sees lives in en.json,
// es.json, ko.json, zh-Hans.json and zh-Hant.json under a named key, so the copy checks judge exactly what is
// shown. `Key` is typed from en.json: a missing key is a type error, never a raw key on screen. A key may hold
// %{name} values and one/other plurals. zh-Hant.json is written from zh-Hans.json by scripts/i18n-hant.mjs.
// There is no fallback: a key missing in any language is a test failure (test/i18n.unit.ts), never English
// shown on a Korean or Chinese screen. The phone's language (./device) picks the start language; Settings
// (or Mi Refugio) passes `locale` per call.
import { I18n, type TranslateOptions } from 'i18n-js';
import en from './en.json';
import es from './es.json';
import ko from './ko.json';
import zhHans from './zh-Hans.json';
import zhHant from './zh-Hant.json';

export const LANGUAGES = ['en', 'es', 'ko', 'zh-Hans', 'zh-Hant'] as const;
export type Language = (typeof LANGUAGES)[number];
export type Key = keyof typeof en;

export const strings = { en, es, ko, 'zh-Hans': zhHans, 'zh-Hant': zhHant } as const;

export const i18n = new I18n(strings, {
  defaultLocale: 'en',
  enableFallback: false,
  // Keys are flat ("door.title"), so nothing is split on '.'.
  defaultSeparator: '\u0000',
});

// Any tag resolves to its one app language and nothing else (es-MX → es; ko-KR → ko; never on to English).
i18n.locales.register('default', (_i18n: I18n, locale: string) => [languageOf(locale || i18n.locale)]);

export function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && (LANGUAGES as readonly string[]).includes(value);
}

/**
 * The app language for a phone locale tag: Spanish, Korean, Chinese (Traditional for a Hant script or a
 * Taiwan, Hong Kong or Macau region, else Simplified), otherwise English. The crisis lines never follow
 * this: they follow the phone's region (chat/ChatScreen.tsx regionHelp, worker/src/replies.ts regionOf).
 */
export function languageOf(tag: string | null | undefined): Language {
  const t = (tag ?? '').replace(/_/g, '-');
  if (/^es(?:-|$)/i.test(t)) return 'es';
  if (/^ko(?:-|$)/i.test(t)) return 'ko';
  if (/^zh(?:-|$)/i.test(t)) return /-(?:hant|tw|hk|mo)(?:-|$)/i.test(t) && !/-hans(?:-|$)/i.test(t) ? 'zh-Hant' : 'zh-Hans';
  return 'en';
}

/** Korean and Chinese screens: the languages with no written-ahead content of their own yet. */
export function isCjk(language: Language): language is 'ko' | 'zh-Hans' | 'zh-Hant' {
  return language === 'ko' || language === 'zh-Hans' || language === 'zh-Hant';
}

/** The language of the written and voiced library (stories, declarations, nights): English or Spanish. */
export function contentLanguage(language: Language): 'en' | 'es' {
  return language === 'es' ? 'es' : 'en';
}

export function setLanguage(language: Language) {
  i18n.locale = language;
}

export function t(key: Key, options?: TranslateOptions & { locale?: string }): string {
  return i18n.t(key, options);
}
