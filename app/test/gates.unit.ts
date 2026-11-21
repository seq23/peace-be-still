import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { FREE_CHAT_MESSAGES, FREE_FEATURES, PAID_CHAT_MESSAGES, PAID_FEATURES, canUse, chatMessagesLeft, type User } from '../src/gates';

const adult: User = { paid: false, age: 'adult' };
const everyone: User[] = (['child', 'teen', 'adult', null] as const).flatMap(age => [{ paid: false, age }, { paid: true, age }]);

test('every free-lane row is open to everyone, paid or not, at any age', () => {
  for (const feature of FREE_FEATURES) for (const user of everyone) assert.equal(canUse(feature, user), true, `${feature} ${JSON.stringify(user)}`);
});

test('every paid-only row is open exactly to paid members', () => {
  for (const feature of PAID_FEATURES.filter(f => f !== 'chatMemory')) {
    assert.equal(canUse(feature, adult), false, feature);
    assert.equal(canUse(feature, { ...adult, paid: true }), true, feature);
  }
});

test('free chat: one conversation a day, up to FREE_CHAT_MESSAGES messages, 13 and over only', () => {
  assert.equal(canUse('chat', adult), true);
  assert.equal(canUse('chat', { ...adult, age: 'teen' }), true);
  assert.equal(canUse('chat', { ...adult, conversationsToday: 1, inCurrentConversation: true, messagesToday: FREE_CHAT_MESSAGES - 1 }), true);
  assert.equal(canUse('chat', { ...adult, conversationsToday: 1, inCurrentConversation: false, messagesToday: 3 }), false);
  assert.equal(canUse('chat', { ...adult, conversationsToday: 1, inCurrentConversation: true, messagesToday: FREE_CHAT_MESSAGES }), false);
  assert.equal(canUse('chat', { ...adult, messagesToday: -1 }), false);
  for (const paid of [false, true]) {
    assert.equal(canUse('chat', { paid, age: 'child' }), false);
    assert.equal(canUse('chat', { paid, age: null }), false);
  }
});

test('paid chat: unlimited conversations up to PAID_CHAT_MESSAGES private messages', () => {
  const member: User = { ...adult, paid: true, conversationsToday: 5 };
  assert.equal(canUse('chat', { ...member, messagesToday: PAID_CHAT_MESSAGES - 1 }), true);
  assert.equal(canUse('chat', { ...member, messagesToday: PAID_CHAT_MESSAGES }), false);
  assert.equal(canUse('chat', { ...member, age: 'teen', messagesToday: 0 }), true);
});

test('chat that remembers is paid and follows the chat age rule', () => {
  assert.equal(canUse('chatMemory', { paid: true, age: 'adult' }), true);
  assert.equal(canUse('chatMemory', { paid: true, age: 'teen' }), true);
  assert.equal(canUse('chatMemory', { paid: true, age: 'child' }), false);
  assert.equal(canUse('chatMemory', { paid: false, age: 'adult' }), false);
});

test('messages left feeds "N of FREE_CHAT_MESSAGES messages left today"', () => {
  assert.equal(chatMessagesLeft({ ...adult, messagesToday: 2 }), FREE_CHAT_MESSAGES - 2);
  assert.equal(chatMessagesLeft({ ...adult, messagesToday: 12 }), 0);
  assert.equal(chatMessagesLeft({ ...adult, paid: true, messagesToday: 7 }), PAID_CHAT_MESSAGES - 7);
  assert.equal(chatMessagesLeft({ paid: true, age: 'child' }), null);
});

test('sleep nights: the first free, then one a week; paid every night', () => {
  assert.equal(canUse('sleepSession', { ...adult, firstSleepUsed: false }), true);
  assert.equal(canUse('sleepSession', { ...adult, firstSleepUsed: true, sleepSessionsThisWeek: 0 }), true);
  assert.equal(canUse('sleepSession', { ...adult, firstSleepUsed: true, sleepSessionsThisWeek: 1 }), false);
  assert.equal(canUse('sleepSession', { ...adult, paid: true, firstSleepUsed: true, sleepSessionsThisWeek: 6 }), true);
});
