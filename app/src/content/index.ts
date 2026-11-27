// Stories and Morning Word declarations as the app serves them: which telling a person reads, what her age band
// may see, which story is today's, every past one, and the declarations behind each topic.
import { contentLanguage } from '../i18n';
import type { Age, JourneyId, Language } from '../model';
import raw from './library.json';
import type { Declaration, GriefLine, Library, Story, Telling } from './types';

export type { Block, Declaration, GriefLine, Story, Telling } from './types';

const library = raw as unknown as Library;
export const topics = library.topics;
export type Topic = string;

/** Spanish readers get Mi Refugio's Spanish tellings; Hush Harbor gets its church voice; everyone else (Bible Chat & Stories too) the plain telling. */
export function tellingFor(language: Language, journey: JourneyId | undefined): Telling {
  if (language === 'es') return 'mi-refugio';
  return journey === 'hush-harbor' ? 'hush-harbor' : 'plain';
}

/**
 * QUALITY.md S10, from each story's own content tags: under 13 sees only stories with violence mild at most and
 * nothing sexual; 13 to 17 sees no strong violence; adults see the whole shelf.
 */
export function fitsAge(story: Story, age: Age | null): boolean {
  if (age === 'adult') return true;
  if (age === 'teen') return story.violence !== 'strong';
  return story.violence !== 'strong' && story.sexual === 'none';
}

export function shelf(telling: Telling, age: Age | null): Story[] {
  return library.stories[telling].filter(story => fitsAge(story, age));
}

const EPOCH = Date.UTC(2026, 0, 1);
/** Whole days since 1 Jan 2026 on the phone's calendar (no daylight-saving drift). */
export function dayNumber(date: Date): number {
  return Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - EPOCH) / 86_400_000);
}
const at = <T>(list: readonly T[], n: number) => list[((n % list.length) + list.length) % list.length];

/** Today's story: the shelf in order, one a day, round and round. */
export function storyFor(list: readonly Story[], date: Date): Story | undefined {
  return list.length ? at(list, dayNumber(date)) : undefined;
}

/** Every past story, newest first, each with the last day it was today's story. Today's own story is not repeated. */
export function pastStories(list: readonly Story[], date: Date): { story: Story; date: Date }[] {
  const today = dayNumber(date);
  return Array.from({ length: Math.max(0, list.length - 1) }, (_, index) => {
    const back = index + 1;
    return { story: at(list, today - back), date: new Date(date.getFullYear(), date.getMonth(), date.getDate() - back) };
  });
}

export function declarations(language: Language): readonly Declaration[] {
  return library.declarations[contentLanguage(language)];
}

/** The free daily declaration follows the day of the year; with a paid topic chosen, it comes from that topic. */
export function dailyDeclaration(language: Language, date: Date, topic?: Topic): Declaration {
  const all = declarations(language);
  const chosen = topic ? all.filter(item => item.topic === topic) : [];
  if (chosen.length) return at(chosen, dayNumber(date));
  const start = new Date(date.getFullYear(), 0, 1);
  const dayOfYear = Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(start.getFullYear(), 0, 1)) / 86_400_000) + 1;
  return all.find(item => item.day === dayOfYear) ?? at(all, dayOfYear - 1);
}

/** "For when you've lost someone": every line, in order. Free; the same for every age band. */
export function griefLines(language: Language): readonly GriefLine[] {
  return library.grief[contentLanguage(language)];
}

export function byTopic(language: Language, topic: Topic): Declaration[] {
  return declarations(language).filter(item => item.topic === topic);
}
