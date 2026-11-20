// The app's product rules as data and pure functions: doors, age bands, journeys, chat voices,
// where a returning person lands. Screens read these; nothing here knows about a page or a string.
import banned from './quality/banned.json';
import type { Key } from './i18n';

export type Door = 'faith' | 'mindset';
export type Age = 'child' | 'teen' | 'adult';
export type Voice = 'plain' | 'church' | 'teen' | 'spanish';
export type Language = 'en' | 'es';
export type JourneyId =
  | 'hush-harbor' | 'mi-refugio' | 'psalm-nights' | 'morning-word' | 'young-faith'
  | 'imagination-nights' | 'morning-word-mindset' | 'living-in-the-end';

export type Journey = {
  id: JourneyId;
  door: Door;
  name: Key;
  subtitle?: Key;
  purpose: Key;
  /** Chat-led: never offered to under-13s. */
  chat: boolean;
  /** The chat voice this journey sets when chosen (a teen always gets the teen voice). */
  voice?: Voice;
  /** Every screen inside this journey uses this language, whatever the app language is. */
  language?: Language;
};

export const journeys: readonly Journey[] = [
  { id: 'hush-harbor', door: 'faith', name: 'journey.hushHarbor.name', subtitle: 'journey.hushHarbor.subtitle', purpose: 'journey.hushHarbor.purpose', chat: true, voice: 'church' },
  { id: 'mi-refugio', door: 'faith', name: 'journey.miRefugio.name', subtitle: 'journey.miRefugio.subtitle', purpose: 'journey.miRefugio.purpose', chat: true, voice: 'spanish', language: 'es' },
  { id: 'psalm-nights', door: 'faith', name: 'journey.psalmNights.name', subtitle: 'journey.psalmNights.subtitle', purpose: 'journey.psalmNights.purpose', chat: false },
  { id: 'morning-word', door: 'faith', name: 'journey.morningWord.name', subtitle: 'journey.morningWord.subtitle', purpose: 'journey.morningWord.purpose', chat: false },
  { id: 'young-faith', door: 'faith', name: 'journey.youngFaith.name', subtitle: 'journey.youngFaith.subtitle', purpose: 'journey.youngFaith.purpose', chat: false, voice: 'teen' },
  { id: 'imagination-nights', door: 'mindset', name: 'journey.imaginationNights.name', purpose: 'journey.imaginationNights.purpose', chat: false },
  { id: 'living-in-the-end', door: 'mindset', name: 'journey.livingInTheEnd.name', purpose: 'journey.livingInTheEnd.purpose', chat: false },
  { id: 'morning-word-mindset', door: 'mindset', name: 'journey.morningWord.name', subtitle: 'journey.morningWord.subtitle', purpose: 'journey.morningWordMindset.purpose', chat: false },
];

export function journeyById(id: string | undefined): Journey | undefined {
  return journeys.find(journey => journey.id === id);
}

/** The journeys this person may pick behind a door: under-13s never see a chat-led one. */
export function journeysFor(door: Door, age: Age | null): Journey[] {
  return journeys.filter(journey => journey.door === door && !(age === 'child' && journey.chat));
}

export type Settings = {
  door: Door | null;
  age: Age | null;
  /** When the age was first entered (ms). Moving to an older band waits 7 days from here. */
  ageSetAt?: number;
  /** The one move to an older band has been used. */
  ageRaised?: boolean;
  voice: Voice;
  language: Language;
  journey?: JourneyId;
  scripture?: boolean;
};

export const initial: Settings = { door: null, age: null, voice: 'plain', language: 'en' };

const LEGACY_NAMES: Record<string, JourneyId> = {
  'Hush Harbor': 'hush-harbor', 'Mi Refugio': 'mi-refugio', 'Psalm Nights': 'psalm-nights', 'Young Faith': 'young-faith',
  'Imagination Nights': 'imagination-nights', 'Living in the end': 'living-in-the-end',
};

/** Reads what was saved, including the first previews' records, which stored journeys by English name. */
export function migrateSettings(raw: unknown, now = Date.now()): Settings {
  const saved = (raw && typeof raw === 'object' ? raw : {}) as Partial<Omit<Settings, 'journey'>> & { journey?: string };
  const door = saved.door === 'faith' || saved.door === 'mindset' ? saved.door : null;
  const age = saved.age === 'child' || saved.age === 'teen' || saved.age === 'adult' ? saved.age : null;
  const name = saved.journey;
  const id = name === 'Morning Word' ? (door === 'mindset' ? 'morning-word-mindset' : 'morning-word') : name && (LEGACY_NAMES[name] ?? name);
  const journey = journeyById(id);
  return {
    door, age,
    ageSetAt: age ? (typeof saved.ageSetAt === 'number' ? saved.ageSetAt : now) : undefined,
    ageRaised: saved.ageRaised === true || undefined,
    voice: saved.voice === 'church' || saved.voice === 'teen' || saved.voice === 'spanish' ? saved.voice : 'plain',
    language: saved.language === 'es' ? 'es' : 'en',
    journey: journey && journey.door === door && !(age === 'child' && journey.chat) ? journey.id : undefined,
    scripture: saved.scripture === true || undefined,
  };
}

/** The two birth years where the band depends on the month (turning 13 or 18 this year). */
export function needsBirthMonth(year: number, now = new Date().getFullYear()): boolean {
  return [13, 18].includes(now - year);
}

export function ageBand(year: number, now = new Date().getFullYear(), month?: number, currentMonth = new Date().getMonth() + 1): Age | null {
  if (!Number.isInteger(year) || year < 1900 || year > now || (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12))) return null;
  const age = now - year;
  const birthdayPassed = month !== undefined && month < currentMonth;
  if (age < 13 || (age === 13 && !birthdayPassed)) return 'child';
  if (age < 18 || (age === 18 && !birthdayPassed)) return 'teen';
  return 'adult';
}

function voiceFor(age: Age, journey: Journey | undefined, current: Voice): Voice {
  if (age === 'teen') return 'teen';
  if (age === 'child') return 'plain';
  const chosen = journey?.voice ?? current;
  return chosen === 'teen' && journey?.id !== 'young-faith' ? 'plain' : chosen;
}

/** First entry of a birth year. */
export function withAge(settings: Settings, age: Age, now = Date.now()): Settings {
  const journey = journeyById(settings.journey);
  const keep = journey && !(age === 'child' && journey.chat);
  return { ...settings, age, ageSetAt: settings.ageSetAt ?? now, journey: keep ? journey.id : undefined, voice: voiceFor(age, keep ? journey : undefined, settings.voice) };
}

export const RAISE_WAIT_MS = 7 * 24 * 60 * 60 * 1000;
const RANK: Record<Age, number> = { child: 0, teen: 1, adult: 2 };

export type Correction =
  | { ok: true; settings: Settings }
  | { ok: false; reason: 'child' | 'used' }
  | { ok: false; reason: 'wait'; until: number };

/**
 * A later re-entry from Settings. Younger or equal is always allowed. Older is allowed once, 7 days after the
 * first entry (a mistyped year is not a life sentence), and never from under 13 (COPPA).
 */
export function correctAge(settings: Settings, age: Age, now = Date.now()): Correction {
  const current = settings.age;
  if (!current || RANK[age] <= RANK[current]) return { ok: true, settings: withAge(settings, age, now) };
  if (current === 'child') return { ok: false, reason: 'child' };
  if (settings.ageRaised) return { ok: false, reason: 'used' };
  const until = (settings.ageSetAt ?? now) + RAISE_WAIT_MS;
  if (now < until) return { ok: false, reason: 'wait', until };
  return { ok: true, settings: { ...withAge(settings, age, now), ageRaised: true } };
}

/** Picking a journey (and with it, from Settings, a door). */
export function chooseJourney(settings: Settings, id: JourneyId): Settings {
  const journey = journeyById(id);
  if (!journey || !settings.age || (settings.age === 'child' && journey.chat)) return settings;
  return { ...settings, door: journey.door, journey: journey.id, voice: voiceFor(settings.age, journey, settings.voice) };
}

/** Under-13s have no chat, so no chat voice. */
export function voicesFor(age: Age | null): Voice[] {
  return age === 'child' ? [] : age === 'teen' ? ['teen'] : ['plain', 'church', 'teen', 'spanish'];
}

export function onboarded(settings: Settings): boolean {
  return !!(settings.door && settings.age && settings.journey);
}

/** Where the app opens: the first unfinished onboarding step, else Today. */
export function startRoute(settings: Settings): '/door' | '/age' | '/journeys' | '/today' {
  if (!settings.door) return '/door';
  if (!settings.age) return '/age';
  if (!settings.journey) return '/journeys';
  return '/today';
}

export type Tab = 'today' | 'chat' | 'bible' | 'nights' | 'more';

/** The tab bar follows the door and the age: no Chat under 13, no Bible on the Mindset door. */
export function tabsFor(settings: Settings): Tab[] {
  return (['today', 'chat', 'bible', 'nights', 'more'] as const).filter(tab =>
    !(tab === 'chat' && settings.age === 'child') && !(tab === 'bible' && settings.door === 'mindset'));
}

/** Screens inside a journey speak its language (Mi Refugio is Spanish); the rest follow the app language. */
export function journeyLanguage(settings: Settings): Language {
  return journeyById(settings.journey)?.language ?? settings.language;
}

// Applied to faith-facing content, including future stories and chat.
export function faithContentIssues(text: string): string[] {
  const normalized = text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const words = new RegExp(`\\b(?:${banned.faith.join('|')})\\b`, 'gu');
  const issues = [...normalized.matchAll(words)].map(match => match[0]);
  if (/\p{Extended_Pictographic}|[☀-➿]/u.test(text)) issues.push('emoji or decorative symbol');
  if (/sparkle|sparkles|sparkling|✨|✦|✧/iu.test(text)) issues.push('sparkle');
  return issues;
}

/** The greeting follows the clock: morning until noon, afternoon until 6 pm, then evening. */
export function partOfDay(hour: number): 'morning' | 'afternoon' | 'evening' {
  return hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 18 ? 'afternoon' : 'evening';
}
