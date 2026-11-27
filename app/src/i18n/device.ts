// The phone's language, kept apart from ./index so the strings load without a native module.
import { getLocales } from 'expo-localization';
import { i18n, languageOf, type Language } from './index';

/** The phone's first preferred language, if the app has strings for it, else English. The full tag
 *  (zh-Hant-TW) is read first, so a Traditional Chinese phone gets Traditional characters. */
export function deviceLanguage(): Language {
  const locale = getLocales()[0];
  return languageOf(locale?.languageTag ?? locale?.languageCode);
}

i18n.locale = deviceLanguage();
