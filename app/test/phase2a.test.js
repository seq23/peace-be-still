import { test } from 'node:test';
import assert from 'node:assert/strict';
import kjvSamples from './fixtures/KJV.json' with { type: 'json' };
import rvSamples from './fixtures/RV1909.json' with { type: 'json' };
import { getVerse, getChapter, searchBible } from '../src/bible/index.js';
import { FEATURES, canUse } from '../src/gates/index.js';
import { resolveLanguage, translate } from '../src/i18n/index.js';
import en from '../src/i18n/en.json' with { type: 'json' };
import es from '../src/i18n/es.json' with { type: 'json' };

for (const [translation, lines] of [['KJV', kjvSamples], ['RV1909', rvSamples]]) {
  test(`${translation}: 200 reproducible random verses match the original archive`, () => {
    assert.equal(lines.length, 200);
    for (const line of lines) {
      const match = line.match(/^(\S+) (\d+):(\d+) (.*)$/);
      assert.ok(match, line);
      assert.equal(getVerse(translation, match[1], +match[2], +match[3]), match[4]);
    }
  });
}
test('lookup, chapter and search return stored verses and reject unknown references', () => {
  assert.equal(getVerse('KJV', 'GEN', 1, 1), 'In the beginning God created the heaven and the earth.');
  assert.equal(getVerse('KJV', 'GEN', 999, 1), null);
  assert.equal(getVerse('unknown', 'GEN', 1, 1), null);
  assert.equal(getChapter('KJV', 'GEN', 1)[0].text, getVerse('KJV', 'GEN', 1, 1));
  assert.equal(getChapter('KJV', 'GEN', 999).length, 0);
  const results = searchBible('RV1909', 'principio', 3);
  assert.equal(results.length, 3);
  for (const v of results) assert.equal(v.text, getVerse('RV1909', v.book, v.chapter, v.verse));
  assert.deepEqual(searchBible('KJV', ' '), []);
});
test('every free and paid feature has the specified access', () => {
  const free = ['BIBLE_TEXT','BIBLE_AUDIO','TODAY_STORY','DAILY_DECLARATION','BASIC_PLANS','SAVED_VERSES','JOURNAL','STREAK','SHARE_CARDS'];
  const premium = ['PAST_STORIES','PERSONAL_SESSION','DECLARATION_TOPICS','LONG_PLANS','OFFLINE','RECORD_OWN_VOICE'];
  assert.deepEqual(new Set([...free, ...premium, 'CHAT', 'CHAT_MEMORY', 'SLEEP_SESSION']), new Set(Object.keys(FEATURES)));
  for (const name of free) for (const paid of [false, true]) assert.equal(canUse(FEATURES[name], { paid }), true, name);
  for (const name of premium) for (const paid of [false, true]) assert.equal(canUse(FEATURES[name], { paid }), paid, name);
  assert.equal(canUse('unknown', { paid: true }), false);
});
test('chat and sleep enforce age and usage limits', () => {
  const u = { ageBand: 'adult', paid: false, messagesToday: 0, conversationsToday: 0 };
  assert.equal(canUse(FEATURES.CHAT, u), true);
  assert.equal(canUse(FEATURES.CHAT, { ...u, conversationsToday: 1, inCurrentConversation: true, messagesToday: 9 }), true);
  assert.equal(canUse(FEATURES.CHAT, { ...u, conversationsToday: 1 }), false);
  assert.equal(canUse(FEATURES.CHAT, { ...u, messagesToday: 10 }), false);
  assert.equal(canUse(FEATURES.CHAT, { ...u, paid: true, messagesToday: 99 }), true);
  assert.equal(canUse(FEATURES.CHAT, { ...u, paid: true, messagesToday: 100 }), false);
  assert.equal(canUse(FEATURES.CHAT, { ...u, ageBand: 'child', paid: true }), false);
  assert.equal(canUse(FEATURES.CHAT, { ...u, ageBand: 'teen' }), true);
  assert.equal(canUse(FEATURES.CHAT_MEMORY, { ...u, ageBand: 'child', paid: true }), false);
  assert.equal(canUse(FEATURES.CHAT_MEMORY, { ...u, ageBand: 'teen', paid: true }), true);
  assert.equal(canUse(FEATURES.CHAT_MEMORY, { ...u, paid: false }), false);
  assert.equal(canUse(FEATURES.CHAT, { paid: true, ageBand: 'adult' }), false);
  assert.equal(canUse(FEATURES.SLEEP_SESSION, { hasUsedFirstSleep: false }), true);
  assert.equal(canUse(FEATURES.SLEEP_SESSION, { hasUsedFirstSleep: true, sleepSessionsThisWeek: 0 }), true);
  assert.equal(canUse(FEATURES.SLEEP_SESSION, { hasUsedFirstSleep: true, sleepSessionsThisWeek: 1 }), false);
  assert.equal(canUse(FEATURES.SLEEP_SESSION, { paid: true }), true);
});
test('locale selection and dictionaries cover the same keys', () => {
  assert.equal(resolveLanguage('es-MX'), 'es');
  assert.equal(resolveLanguage('fr'), 'en');
  for (const group of Object.keys(en)) {
    assert.deepEqual(Object.keys(es[group]).sort(), Object.keys(en[group]).sort());
    for (const key of Object.keys(en[group])) assert.equal(translate('es', `${group}.${key}`), es[group][key]);
  }
  assert.equal(translate('fr', 'common.back'), en.common.back);
  assert.equal(translate('es', 'missing.key'), 'missing.key');
});
