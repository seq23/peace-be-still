/** The entitlement is supplied by the purchase layer; usage counters are supplied by the caller. */
export const FEATURES = Object.freeze({
  BIBLE_TEXT: 'bibleText', BIBLE_AUDIO: 'bibleAudio', TODAY_STORY: 'todayStory',
  PAST_STORIES: 'pastStories', CHAT: 'chat', CHAT_MEMORY: 'chatMemory',
  SLEEP_SESSION: 'sleepSession', PERSONAL_SESSION: 'personalSession',
  DAILY_DECLARATION: 'dailyDeclaration', DECLARATION_TOPICS: 'declarationTopics',
  BASIC_PLANS: 'basicPlans', LONG_PLANS: 'longPlans', SAVED_VERSES: 'savedVerses',
  JOURNAL: 'journal', STREAK: 'streak', SHARE_CARDS: 'shareCards', OFFLINE: 'offline',
  RECORD_OWN_VOICE: 'recordOwnVoice',
});
const free = new Set([FEATURES.BIBLE_TEXT, FEATURES.BIBLE_AUDIO, FEATURES.TODAY_STORY,
  FEATURES.DAILY_DECLARATION, FEATURES.BASIC_PLANS, FEATURES.SAVED_VERSES,
  FEATURES.JOURNAL, FEATURES.STREAK, FEATURES.SHARE_CARDS]);
const paid = new Set([FEATURES.PAST_STORIES, FEATURES.CHAT_MEMORY, FEATURES.PERSONAL_SESSION,
  FEATURES.DECLARATION_TOPICS, FEATURES.LONG_PLANS, FEATURES.OFFLINE, FEATURES.RECORD_OWN_VOICE]);

export function canUse(feature, user) {
  if (!user) return false;
  if (free.has(feature)) return true;
  if (feature === FEATURES.CHAT_MEMORY) {
    return user.paid === true && (user.ageBand === 'teen' || user.ageBand === 'adult');
  }
  if (feature === FEATURES.CHAT) {
    if (user.ageBand !== 'teen' && user.ageBand !== 'adult') return false;
    const messages = user.messagesToday;
    if (!Number.isInteger(messages) || messages < 0) return false;
    if (user.paid === true) return messages < 100;
    const conversations = user.conversationsToday;
    if (!Number.isInteger(conversations) || conversations < 0) return false;
    return messages < 10 && (conversations === 0 || (conversations === 1 && user.inCurrentConversation === true));
  }
  if (feature === FEATURES.SLEEP_SESSION) {
    if (user.paid === true) return true;
    return user.hasUsedFirstSleep === false || (user.hasUsedFirstSleep === true && user.sleepSessionsThisWeek === 0);
  }
  return paid.has(feature) && user.paid === true;
}
