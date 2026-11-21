import banned from './quality/banned.json';
export type Door = 'faith' | 'mindset';
export type Age = 'child' | 'teen' | 'adult';
export type Voice = 'plain' | 'church' | 'teen' | 'spanish';
export type Settings = { door: Door | null; age: Age | null; voice: Voice; language: 'en' | 'es'; journey?: string; scripture?: boolean };
export const initial: Settings = { door: null, age: null, voice: 'plain', language: 'en' };
export function ageBand(year: number, now = new Date().getFullYear(), month?: number, currentMonth = new Date().getMonth() + 1): Age | null {
  if (!Number.isInteger(year) || year < 1900 || year > now || (month !== undefined && (!Number.isInteger(month) || month < 1 || month > 12))) return null;
  const age = now - year;
  const birthdayPassed = month !== undefined && month < currentMonth;
  if (age < 13 || (age === 13 && !birthdayPassed)) return 'child';
  if (age < 18 || (age === 18 && !birthdayPassed)) return 'teen';
  return 'adult';
}
export function correctAge(settings: Settings, age: Age): Settings {
  const rank: Record<Age, number> = { child: 0, teen: 1, adult: 2 };
  return settings.age && rank[age] > rank[settings.age] ? settings : withAge(settings, age);
}
export function withAge(settings: Settings, age: Age): Settings {
  const chatLed = settings.journey === 'Hush Harbor' || settings.journey === 'Mi Refugio';
  return { ...settings, age, journey: age === 'child' && chatLed ? undefined : settings.journey, voice: age === 'teen' ? 'teen' : age === 'child' || settings.voice === 'teen' ? 'plain' : settings.voice };
}
export const faithJourneys = [
  ['Hush Harbor', 'Black Bible Chat & Stories', 'For when you want to talk it through, the way you would with family'],
  ['Mi Refugio', 'Biblia y Chat en Español', 'Scripture and conversation in Spanish'],
  ['Psalm Nights', 'Whispered Scripture for Sleep', "For when you can't sleep. First night free, then one a week"],
  ['Morning Word', 'Daily Declarations', 'For mornings: one verse, one thing to say out loud, one short prayer'],
  ['Young Faith', 'Bible for Teens', 'Ages 13 to 17. Plain words, real questions'],
] as const;
export const mindsetJourneys = [['Imagination Nights', '', 'Whispered night sessions: rest inside the scene you hope for'], ['Morning Word', 'Daily Declarations', 'One line to say out loud, morning and night'], ['Living in the end', '', 'Write your scene as if it is true now, then hear it whispered back']] as const;

// Applied to faith-facing content, including future stories and chat.
export function faithContentIssues(text: string): string[] {
  const normalized = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const words = new RegExp(`\\b(?:${banned.faith.join('|')})\\b`, 'gu');
  const issues = [...normalized.matchAll(words)].map(match => match[0]);
  if (/\p{Extended_Pictographic}|[\u2600-\u27bf]/u.test(text)) issues.push('emoji or decorative symbol');
  if (/sparkle|sparkles|sparkling|✨|✦|✧/iu.test(text)) issues.push('sparkle');
  return issues;
}
