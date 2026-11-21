// The free and paid lanes (COMMON.md, locked 18 Nov 2026). `paid` comes from the purchase layer;
// the day's counts come from the caller. Nothing free is ever taken back.
import type { Age } from '../model';

export const FREE_CHAT_MESSAGES = 10;
/** Fair use for every paid subscriber, monthly and yearly (her ruling 21 Nov 2026). The one setting: the worker's
 * daily limit and every user-facing line (price screen, terms, privacy, store listing, site) say this number. */
export const PAID_CHAT_MESSAGES = 50;
/** When free chat has nothing after her private messages, the private model answers briefly, at most this many a day; then "busy". */
export const PAID_SHORT_ANSWERS_DAILY = 50;

export const FREE_FEATURES = [
  'bibleText', 'bibleAudio', 'todayStory', 'dailyDeclaration', 'basicPlans',
  'savedVerses', 'journal', 'streak', 'shareCards',
] as const;
export const PAID_FEATURES = [
  'chatMemory', 'personalSession', 'pastStories', 'longPlans', 'declarationTopics',
  'offline',
] as const;
export type Feature = (typeof FREE_FEATURES)[number] | (typeof PAID_FEATURES)[number] | 'chat' | 'sleepSession';

export type User = {
  paid: boolean;
  age: Age | null;
  /** Chat messages she has sent today. */
  messagesToday?: number;
  /** Conversations started today, and whether she is inside today's one. */
  conversationsToday?: number;
  inCurrentConversation?: boolean;
  /** Sleep nights: the first is free, then one a week. */
  firstSleepUsed?: boolean;
  sleepSessionsThisWeek?: number;
};

const count = (value: number | undefined) => (Number.isInteger(value) && value! >= 0 ? value! : null);
/** Under 13 (or age not yet given): no chat at all. 13 and over: chat. */
const mayChat = (user: User) => user.age === 'teen' || user.age === 'adult';

/** Messages left today, for "N of 10 messages left today"; null when chat is closed to her. */
export function chatMessagesLeft(user: User): number | null {
  if (!mayChat(user)) return null;
  const sent = count(user.messagesToday ?? 0);
  if (sent === null) return null;
  return Math.max(0, (user.paid ? PAID_CHAT_MESSAGES : FREE_CHAT_MESSAGES) - sent);
}

export function canUse(feature: Feature, user: User): boolean {
  if ((FREE_FEATURES as readonly string[]).includes(feature)) return true;
  switch (feature) {
    case 'chat': {
      const left = chatMessagesLeft(user);
      if (!left) return false;
      if (user.paid) return true;
      const conversations = count(user.conversationsToday ?? 0);
      return conversations === 0 || (conversations === 1 && user.inCurrentConversation === true);
    }
    case 'chatMemory':
      return user.paid && mayChat(user);
    case 'sleepSession': {
      if (user.paid || !user.firstSleepUsed) return true;
      return count(user.sleepSessionsThisWeek ?? 0) === 0;
    }
    default:
      return (PAID_FEATURES as readonly string[]).includes(feature) && user.paid;
  }
}
