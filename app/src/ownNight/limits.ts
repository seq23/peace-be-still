// "Write your own night" (her ruling 24 Nov 2026: paid only, adults only, in Living in the end). Every number the
// feature has lives here once: the phone's editor, the saved-nights shelf, the player's schedule and the Worker's
// own caps (worker/src/ownNight.ts imports this file) read the same values.

/** The night lengths she picks from, in minutes. */
export const OWN_NIGHT_MINUTES = [20, 45, 90] as const;
export type OwnNightMinutes = (typeof OWN_NIGHT_MINUTES)[number];
/** Saved nights kept on the phone (REVIEW FIXES 24 Nov 2026: N = 20). */
export const SAVED_NIGHTS_MAX = 20;
/** What she types: the wish, and who is with her. The Worker refuses anything longer. */
export const WISH_MAX = 400;
export const WHO_MAX = 120;
/** The moment itself, written by the model or by her: short enough to say in one slow breath or two. */
export const SCENE_MAX = 500;
/** The request body the Worker reads at most (the fields above, JSON-escaped, with room to spare). */
export const SCENE_BODY_MAX_BYTES = 4096;
/** One write is this many messages of the paid plan's daily private chat allowance (PAID_CHAT_MESSAGES). */
export const SCENE_MESSAGE_COST = 1;
/** A recording longer than this is stopped: the moment is a few sentences, never a lecture. */
export const RECORDING_MAX_SECONDS = 60;
