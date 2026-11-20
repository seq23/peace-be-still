import en from './en.json' with { type: 'json' };
import es from './es.json' with { type: 'json' };
const dictionaries = { en, es };
export function resolveLanguage(locale) {
  return typeof locale === 'string' && /^es(?:[-_]|$)/i.test(locale) ? 'es' : 'en';
}
export function translate(locale, key) {
  const lookup = (dictionary) => key.split('.').reduce((value, part) => value && typeof value === 'object' ? value[part] : undefined, dictionary);
  return lookup(dictionaries[resolveLanguage(locale)]) ?? lookup(en) ?? key;
}
