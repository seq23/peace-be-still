// 새벽기도 (the Korean dawn-prayer journey): its 40 written mornings, the day count, who is offered it, the dawn
// reminder's time and words, and the KakaoTalk card's lines. The screens themselves are in screens.render.tsx.
process.env.TZ = 'America/Chicago';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { buildContent } from '../src/content/build';
import { dawnFor, type DawnWord } from '../src/content';
import en from '../src/i18n/en.json';
import es from '../src/i18n/es.json';
import ko from '../src/i18n/ko.json';
import zhHans from '../src/i18n/zh-Hans.json';
import zhHant from '../src/i18n/zh-Hant.json';
import { chooseJourney, dayKey, faithContentIssues, initial, journeyById, journeyLanguage, journeysFor, migrateSettings, type Settings } from '../src/model';
import { DEFAULT_TIMES, formatTime, reminderKind, sync, timeOf, withTime, initialReminder } from '../src/reminders/reminder';
import { squareLayout, wrapLines } from '../src/share/wrap';

const file = JSON.parse(readFileSync('../content/saebyeok/ko.json', 'utf8')) as { items: Array<{ id: string; day: number; title: string; ref: string; translation: string; verses: Array<{ v: number; text: string }>; prayer: string }> };
const krv = new Map(gunzipSync(readFileSync('../content/bible/krv_vpl.txt.gz')).toString('utf8').split('\n').filter(Boolean).map(line => {
  const [book, cv, ...words] = line.split(' ');
  return [`${book} ${cv}`, words.join(' ')] as const;
}));
const adult: Settings = { ...initial, door: 'faith', age: 'adult', ageSetAt: 0, language: 'ko' };
const words = buildContent().library.dawn;

test('40 mornings, one a day in order, all reaching the app, with no pass mark the builder gave itself', () => {
  assert.equal(file.items.length, 40);
  assert.deepEqual(file.items.map(item => item.day), Array.from({ length: 40 }, (_, i) => i + 1));
  assert.equal(new Set(file.items.map(item => item.id)).size, 40);
  assert.equal(new Set(file.items.map(item => item.ref)).size, 40, 'no verse twice');
  assert.equal(words.length, 40, 'every morning reaches the app');
  for (const item of file.items as Array<Record<string, unknown>>) assert.ok(!('qa' in item) && !('status' in item), `${item.id}: no self-grade in the content file`);
  // The app ships the reference only: the screen reads the verse from its bundled 개역한글, never a copy.
  for (const word of words) assert.deepEqual(Object.keys(word).sort(), ['day', 'id', 'prayer', 'ref', 'title']);
});

test('every verse is the stored 개역한글, word for word, and covers exactly its reference', () => {
  for (const item of file.items) {
    assert.equal(item.translation, 'KRV', item.id);
    const [book, cv] = item.ref.split(' ');
    const [chapter, range] = cv.split(':');
    const [first, last = first] = range.split('-').map(Number);
    assert.deepEqual(item.verses.map(verse => verse.v), Array.from({ length: Number(last) - Number(first) + 1 }, (_, i) => Number(first) + i), item.id);
    for (const verse of item.verses) assert.equal(verse.text, krv.get(`${book} ${chapter}:${verse.v}`), `${item.id} ${book} ${chapter}:${verse.v}`);
  }
});

test('every prayer is written in Korean to God, passes the faith gate, is short, and ends in Jesus\' name', () => {
  for (const item of file.items) {
    assert.deepEqual(faithContentIssues(`${item.title} ${item.prayer}`), [], item.id);
    assert.match(item.prayer, /^(주님|하나님|예수님|성령님|예수님도)/u, `${item.id} speaks to God, never as God`);
    assert.match(item.prayer, /예수님의 이름으로 기도합니다\. 아멘\.$/u, item.id);
    assert.doesNotMatch(item.prayer + item.title, /[A-Za-z]/, `${item.id}: no English inside a Korean prayer`);
    assert.ok(item.prayer.length <= 160, `${item.id} is ${item.prayer.length} characters`);
    assert.ok(item.title.length <= 12, `${item.id} title fits the card label`);
  }
});

test('the day count: day 1 is the day she picked it, day 40 the last, day 41 starts the 40 again', () => {
  const start = '2026-12-01';
  const on = (y: number, m: number, d: number, h = 5) => dawnFor(start, new Date(y, m - 1, d, h))!;
  assert.deepEqual([on(2026, 12, 1).day, on(2026, 12, 1).round, on(2026, 12, 1).word.id], [1, 1, 'dawn-001']);
  assert.deepEqual([on(2027, 1, 9).day, on(2027, 1, 9).round, on(2027, 1, 9).word.id], [40, 1, 'dawn-040']);
  assert.deepEqual([on(2027, 1, 10).day, on(2027, 1, 10).round, on(2027, 1, 10).word.id], [1, 2, 'dawn-001']);
  assert.deepEqual([on(2027, 2, 19).day, on(2027, 2, 19).round], [1, 3]);
  // Midnight turns the day; 11:59 PM is still the same morning.
  assert.equal(on(2026, 12, 1, 23).day, 1);
  assert.equal(dawnFor(start, new Date(2026, 11, 1, 23, 59))!.day, 1);
  assert.equal(dawnFor(start, new Date(2026, 11, 2, 0, 1))!.day, 2);
});

test('a clock change never skips or repeats a morning (Chicago: fall back 1 Nov 2026, spring forward 14 Mar 2027)', () => {
  const days = (start: string, dates: Date[]) => dates.map(date => dawnFor(start, date)!.day);
  assert.deepEqual(days('2026-10-31', [new Date(2026, 9, 31, 5), new Date(2026, 10, 1, 0, 30), new Date(2026, 10, 1, 5), new Date(2026, 10, 2, 5)]), [1, 2, 2, 3]);
  assert.deepEqual(days('2027-03-13', [new Date(2027, 2, 13, 23, 59), new Date(2027, 2, 14, 3, 30), new Date(2027, 2, 15, 0, 0)]), [1, 2, 3]);
});

test('a missing, unreadable or future start counts as day 1, and no morning at all is undefined, never a crash', () => {
  const now = new Date(2026, 11, 5, 5);
  for (const start of [undefined, '', 'yesterday', '2026-13-45x', '2027-01-01']) assert.equal(dawnFor(start, now)!.day, 1, String(start));
  assert.equal(dawnFor('2026-12-01', now, [] as DawnWord[]), undefined);
});

test('offered behind the God\'s Word door on a Korean phone only, to every age band (it has no chat)', () => {
  for (const age of ['child', 'teen', 'adult'] as const) assert.ok(journeysFor('faith', age, 'ko').some(j => j.id === 'saebyeok'), age);
  for (const language of ['en', 'es', 'zh-Hans', 'zh-Hant'] as const) assert.ok(!journeysFor('faith', 'adult', language).some(j => j.id === 'saebyeok'), language);
  assert.ok(!journeysFor('mindset', 'adult', 'ko').some(j => j.id === 'saebyeok'));
  assert.equal(journeyById('saebyeok')!.chat, false);
});

test('picking it starts day 1 today; picking it again keeps her day; leaving and coming back starts again; the start survives a reload', () => {
  const picked = chooseJourney({ ...adult, journey: 'psalm-nights' }, 'saebyeok', new Date(2026, 11, 3, 21));
  assert.equal(picked.journey, 'saebyeok');
  assert.equal(picked.dawnStart, '2026-12-03');
  assert.equal(journeyLanguage(picked), 'ko', 'its screens are Korean');
  assert.equal(chooseJourney(picked, 'saebyeok', new Date(2026, 11, 20)).dawnStart, '2026-12-03');
  const away = chooseJourney(picked, 'morning-word', new Date(2026, 11, 21));
  assert.equal(chooseJourney(away, 'saebyeok', new Date(2027, 0, 4)).dawnStart, '2027-01-04');
  assert.equal(migrateSettings(JSON.parse(JSON.stringify(picked))).dawnStart, '2026-12-03');
  assert.equal(migrateSettings({ ...picked, dawnStart: 'soon' }).dawnStart, undefined);
  assert.equal(migrateSettings({ ...picked, dawnStart: 20261203 }).dawnStart, undefined);
  assert.equal(dayKey(new Date(2026, 11, 3)), '2026-12-03');
});

test('the dawn reminder: 5:00 AM by default, the time she picks (across midnight too), shown as a Korean phone shows it', async () => {
  assert.equal(reminderKind('saebyeok'), 'dawn');
  assert.deepEqual(DEFAULT_TIMES.dawn, { hour: 5, minute: 0 });
  assert.deepEqual(timeOf(initialReminder, 'dawn'), { hour: 5, minute: 0 });
  assert.equal(formatTime({ hour: 5, minute: 0 }, 'ko'), '오전 5:00');
  assert.equal(formatTime({ hour: 23, minute: 40 }, 'ko'), '오후 11:40');
  assert.equal(formatTime({ hour: 23, minute: 40 }, 'zh-Hans'), '23:40', 'a Chinese phone shows a 24-hour clock');
  assert.equal(formatTime({ hour: 5, minute: 0 }, 'en'), '5:00 AM');
  const booked: Array<[number, number, string]> = [];
  const phone = { getPermission: async () => 'granted' as const, requestPermission: async () => 'granted' as const, cancelAll: async () => { booked.length = 0; },
    scheduleDaily: async (_id: string, c: { body: string }, hour: number, minute: number) => { booked.push([hour, minute, c.body]); } };
  const content = { title: 'Peace Be Still', body: ko['reminder.body.dawn'], kind: 'dawn' as const };
  await sync(phone, { on: true }, content);
  assert.deepEqual(booked, [[5, 0, ko['reminder.body.dawn']]]);
  for (const [hour, minute] of [[23, 40], [0, 20], [4, 30]]) {
    await sync(phone, withTime({ on: true }, hour, minute), content);
    assert.deepEqual(booked, [[hour, minute, ko['reminder.body.dawn']]], `${hour}:${minute}`);
  }
  await sync(phone, withTime({ on: true }, 24, 0), content);
  assert.deepEqual(booked, [[5, 0, ko['reminder.body.dawn']]], 'an impossible time keeps the default');
});

test('every new line exists in all five languages; the dawn words say dawn, and the reminder never guilts', () => {
  const keys = ['journey.saebyeok.name', 'journey.saebyeok.subtitle', 'journey.saebyeok.purpose', 'dawn.title', 'dawn.day', 'dawn.dayAgain', 'dawn.open', 'dawn.prayed',
    'dawn.share', 'dawn.reminder', 'dawn.newYear', 'reminder.offer.title.dawn', 'reminder.body.dawn', 'reminder.settings.deniedInApp'] as const;
  for (const strings of [en, es, ko, zhHans, zhHant] as unknown as Array<Record<string, string>>) for (const key of keys) assert.ok(strings[key]?.trim(), key);
  assert.match(ko['reminder.offer.title.dawn'], /새벽/u);
  assert.match(ko['reminder.body.dawn'], /새벽 말씀/u);
  assert.equal(ko['journey.saebyeok.name'], '새벽기도');
  for (const strings of [en, es, ko] as unknown as Array<Record<string, string>>) {
    for (const key of ['reminder.offer.title.dawn', 'reminder.body.dawn', 'reminder.settings.deniedInApp']) assert.doesNotMatch(strings[key], /missed|streak|놓쳤|연속|perdiste|racha/iu, key);
  }
  assert.match(ko['dawn.day'], /%\{day\}/); assert.match(ko['dawn.day'], /%\{total\}/);
});

test('the KakaoTalk card\'s lines: a Korean verse wraps on its spaces within the width, a Chinese one between characters, and no word is lost', () => {
  const ems = (line: string) => [...line].reduce((sum, ch) => sum + (/[\p{Script=Hangul}\p{Script=Han}]/u.test(ch) ? 1 : 0.6), 0);
  for (const item of file.items) {
    const text = item.verses.map(verse => verse.text).join(' ');
    for (const size of [34, 30, 26, 22, 20, 18, 16]) {
      const lines = wrapLines(text, 440 / size);
      assert.equal(lines.join(' '), text.split(/\s+/).join(' '), `${item.id} keeps every word`);
      for (const line of lines) assert.ok(ems(line) <= 440 / size, `${item.id} "${line}" fits`);
    }
  }
  // Every morning's verse fits the square card at a readable size, inside the space between the label and the credit.
  for (const item of file.items) {
    const card = squareLayout(item.verses.map(verse => verse.text).join(' '));
    assert.ok(card.fontSize >= 20, `${item.id} at ${card.fontSize}`);
    assert.ok(card.top - card.fontSize >= 140 && card.top - card.fontSize + card.lines.length * card.leading <= 420, `${item.id} stays inside`);
  }
  const chinese = '你们要先求他的国和他的义这些东西都要加给你们了';
  const lines = wrapLines(chinese, 10);
  assert.equal(lines.join(''), chinese);
  assert.ok(lines.length === 3 && lines.every(line => ems(line) <= 10));
  assert.deepEqual(wrapLines('Peace, be still.', 20), ['Peace, be still.']);
  assert.deepEqual(wrapLines('', 20), []);
});
