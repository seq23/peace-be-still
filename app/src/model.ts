export type Door = 'faith' | 'mindset';
export type Age = 'child' | 'teen' | 'adult';
export type Voice = 'plain' | 'church' | 'teen' | 'spanish';
export type Settings = { door: Door | null; age: Age | null; voice: Voice; language: 'en' | 'es'; journey?: string };
export const initial: Settings = { door: null, age: null, voice: 'plain', language: 'en' };
export function ageBand(year: number, now = new Date().getFullYear()): Age | null {
  if (!Number.isInteger(year) || year < 1900 || year > now) return null;
  const age = now - year;
  // A birth year alone cannot establish whether this year's birthday has passed.
  return age <= 13 ? 'child' : age <= 18 ? 'teen' : 'adult';
}
export function withAge(settings: Settings, age: Age): Settings {
  return { ...settings, age, voice: age === 'teen' ? 'teen' : settings.voice === 'teen' ? 'plain' : settings.voice };
}
export const faithJourneys = [
  ['Hush Harbor', 'Black Bible Chat & Stories'], ['Mi Refugio', 'Biblia y Chat en Español'],
  ['Psalm Nights', 'Whispered Scripture for Sleep'], ['Morning Word', 'Daily Declarations'], ['Young Faith', 'Bible for Teens'],
] as const;
export const mindsetJourneys = [['Imagination Nights', 'A quiet scene for sleep'], ['Morning Word', 'Daily declarations'], ['Living in the end', 'Write your scene']] as const;

// Applied to faith-facing content, including future stories and chat.
export function faithContentIssues(text: string): string[] {
  const normalized = text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const words = /\b(manifest(?:ar|ing|ation)?|universe|universo|vibration|vibracion|energy|energia|law of (?:attraction|assumption)|ley de atraccion|neville|abundance mindset|karma|chakra|aura|crystal|mantra|higher self|the source|align|attract|visualize|urban|speak life)\b|black[\W_]*bible[\W_]*stories/gu;
  const issues = [...normalized.matchAll(words)].map(match => match[0]);
  if (/\p{Extended_Pictographic}|[\u2600-\u27bf]/u.test(text)) issues.push('emoji or decorative symbol');
  if (/sparkle|sparkles|sparkling|✨|✦|✧/iu.test(text)) issues.push('sparkle');
  return issues;
}
