// The one chat contract between the app and the Worker (worker/src/index.ts imports these types).
// A request is built from phase 1's Settings, so the door, voice and language ids cannot drift.
import type { Translation } from '../bible/core';
import type { Settings } from '../model';

export type ChatTurn = { role: 'user' | 'assistant'; text: string };
export type ChatRequest = {
  conversation: string;
  messages: ChatTurn[];
  door: NonNullable<Settings['door']>;
  voice: Settings['voice'];
  language: Settings['language'];
  journey?: string;
  /** She agreed, once, that free chat goes to a free AI service that may keep what she types. Free chat needs it. */
  freeConsent?: boolean;
  /** A paid user accepted free chat (not private) for the rest of today, after her private messages. */
  overflowConsent?: boolean;
  /** The phone's region (ISO alpha-2, from its settings): which crisis lines reach her. */
  region?: string;
};
export type ChatScripture = { ref: string; translation: Translation; text: string; book: string; chapter: number; verse: number; endVerse?: number };
// consent: free chat needs her one-time yes first. paused: chat is paused on this install (operator or
// abuse throttle). overflow_consent: a paid user's private messages for today (or this month) are used;
// she may keep chatting on the free lane (not private) once she accepts, or wait. Nothing was sent.
export type ChatKind = 'answer' | 'crisis' | 'fallback' | 'limit' | 'busy' | 'no_free_model' | 'consent' | 'paused' | 'overflow_consent';
export type ChatResponse = {
  kind: ChatKind;
  /** True for every answer written (or stood in for) by the AI helper; false for fixed human-written replies. */
  ai: boolean;
  text: string;
  scripture: ChatScripture[];
  /** Messages left today, for "N of 5 messages left today"; null when not counted (crisis). */
  remaining: number | null;
  /** Today's allowance the count is out of (10 free, 100 paid); null when not counted. */
  limit: number | null;
  /** Teens: time for the "you're talking with an AI, take a break" reminder (California SB 243). */
  reminder: boolean;
  crisis?: 'selfharm' | 'abuse' | 'child_abuse' | 'medical';
  /** Crisis replies: the words shown before the card, ending in "Are you safe right now?". ai is true when
   *  the private crisis model wrote the first part; the card (text) and its hotlines are fixed, never AI. */
  checkIn?: { text: string; ai: boolean };
  /** A fixed reply that names free crisis lines in its text (a teen past her one answer today, and every free
   *  day's wall): shown with the same call and text buttons as the crisis card. */
  helpLines?: boolean;
  /** True when the text is a fixed line written in code (who it is; the one-translation note), not a model's words. */
  fixed?: boolean;
  /** Answered on the free lane she chose after her private messages: shown as "Free chat (not private)". */
  notPrivate?: boolean;
  /** This answer is the install's private first chat (the Worker decides; firstprivate.ts). */
  firstPrivate?: boolean;
};

/** Null when chat is closed to her (under 13, or no door chosen yet). Only the last 12 turns travel. */
export function buildChatRequest(settings: Settings, conversation: string, messages: ChatTurn[], freeConsent = false, region?: string | null, overflowConsent = false): ChatRequest | null {
  if (!settings.door || settings.age === 'child' || settings.age === null) return null;
  return {
    conversation,
    messages: messages.slice(-12),
    door: settings.door,
    voice: settings.age === 'teen' ? 'teen' : settings.voice,
    // The screen language: chat answers in it, quoting that language's Bible (KJV, RV1909, 개역한글, 1919 和合本).
    language: settings.language,
    ...(settings.journey ? { journey: settings.journey } : {}),
    ...(freeConsent ? { freeConsent: true } : {}),
    ...(overflowConsent ? { overflowConsent: true } : {}),
    ...(region && /^[A-Za-z]{2}$/.test(region) ? { region: region.toUpperCase() } : {}),
  };
}
