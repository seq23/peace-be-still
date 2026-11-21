// The app's one set of strings. Keys are the English text (en.json, es.json); a key may hold
// %{name} values and one/other plural forms. The phone's language (./device) picks the start
// language; Settings (or Mi Refugio) overrides it per call with `t(key, { locale })`.
import { I18n, type TranslateOptions } from 'i18n-js';
import en from './en.json';
import es from './es.json';

export type Language = 'en' | 'es';

export const i18n = new I18n({ en, es }, {
  defaultLocale: 'en',
  enableFallback: true,
  // Keys are sentences with full stops in them, so nothing is split on '.'.
  defaultSeparator: '\u0000',
});
// A string without a key (a journey or book name) is shown as written.
i18n.missingTranslation.register('show-key', (_i18n, scope) => String(scope));
i18n.missingBehavior = 'show-key';

/** 'es' for any Spanish locale tag (es, es-MX, es_419), otherwise 'en'. */
export function languageOf(tag: string | null | undefined): Language {
  return /^es(?:[-_]|$)/i.test(tag ?? '') ? 'es' : 'en';
}

export function setLanguage(language: Language) {
  i18n.locale = language;
}

export function t(key: string, options?: TranslateOptions & { locale?: string }): string {
  return i18n.t(key, options);
}
