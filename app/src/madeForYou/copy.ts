import { i18n, type Key } from '../i18n';
import type { Language } from '../model';

// Made for you's words live in the app's language files under "madeForYou.*" (moved 27 Nov 2026 so Korean and
// Chinese are held to the same no-fallback check as every other screen). Sessions themselves are made in English
// or Spanish (contentLanguage), and the Korean and Chinese copy says so.
type Prefixed = Extract<Key, `madeForYou.${string}`>;
export type CopyKey = Prefixed extends `madeForYou.${infer K}` ? K : never;
export function madeForYouCopy(locale: Language) {
  return (key: CopyKey, values: Record<string, string | number> = {}) => i18n.t(`madeForYou.${key}`, { locale, count: 0, ...values });
}

/** "by 8:00 AM", "by 8:00 AM tomorrow" or "by 8:00 AM Saturday", in the phone's own time zone. */
export function readyWhen(dueAt: number, locale: Language, now = Date.now()): string {
  const copy = madeForYouCopy(locale);
  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(dueAt);
  const date = (at: number) => new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
  const days = Math.round((Date.parse(date(dueAt)) - Date.parse(date(now))) / 86_400_000);
  if (days <= 0) return copy('whenToday', { time });
  if (days === 1) return copy('whenTomorrow', { time });
  return copy('whenDay', { time, weekday: new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(dueAt) });
}
