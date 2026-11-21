// The daily reminder's promises, proven on a fake phone that keeps a real schedule (an id books one entry, a
// second booking with the same id replaces it, entries with other ids stay until cleared).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import en from '../src/i18n/en.json';
import es from '../src/i18n/es.json';
import {
  ASK_AGAIN_MS, DEFAULT_TIME, REMINDER_ID, initialReminder, markFirstValue, notNow, parseReminder, shouldOffer, withTime,
  sync, turnOff, turnOn, type NotificationsApi, type Permission,
} from '../src/reminders/reminder';

const content = { title: 'Peace Be Still', body: en['reminder.body'] };
const DAY = 86_400_000;

function fakePhone(permission: Permission = 'undetermined', answer: Permission = 'granted') {
  const schedule = new Map<string, { hour: number; minute: number; body: string }>();
  const calls = { request: 0 };
  const phone: NotificationsApi & { schedule: typeof schedule; calls: typeof calls; permission: Permission } = {
    schedule, calls, permission,
    getPermission: async () => phone.permission,
    requestPermission: async () => { calls.request++; phone.permission = answer; return answer; },
    cancelAll: async () => { schedule.clear(); },
    scheduleDaily: async (id, c, hour, minute) => { schedule.set(id, { hour, minute, body: c.body }); },
  };
  return phone;
}

test('never more than one reminder a day: reopening, a new time, a leftover from a reinstall and a time zone change all leave exactly one', async () => {
  const phone = fakePhone('granted');
  let state = await turnOn(phone, markFirstValue(initialReminder), content);
  assert.equal(state.on, true);
  assert.deepEqual([...phone.schedule.keys()], [REMINDER_ID]);
  // The app killed and reopened ten times: each open syncs from the saved record.
  for (let i = 0; i < 10; i++) state = await sync(phone, parseReminder(JSON.parse(JSON.stringify(state))), content);
  assert.equal(phone.schedule.size, 1);
  // A new time replaces the old one; it never adds a second.
  state = await sync(phone, withTime(state, 21, 0), content);
  assert.deepEqual([...phone.schedule.values()].map(e => [e.hour, e.minute]), [[21, 0]]);
  // A reinstall can leave an entry the new copy did not book (another id); the next sync clears it.
  phone.schedule.set('left-over-from-an-older-install', { hour: 7, minute: 0, body: 'old' });
  await sync(phone, state, content);
  assert.deepEqual([...phone.schedule.keys()], [REMINDER_ID]);
  // A time zone change: the booking is a local daily time (hour and minute), so the phone rings once in the new zone.
  const before = process.env.TZ;
  process.env.TZ = 'Asia/Tokyo';
  try { await sync(phone, state, content); } finally { if (before === undefined) delete process.env.TZ; else process.env.TZ = before; }
  assert.equal(phone.schedule.size, 1);
  assert.deepEqual(phone.schedule.get(REMINDER_ID), { hour: 21, minute: 0, body: content.body });
});

test('turning it off clears every scheduled notification at once, and a reopen keeps it clear', async () => {
  const phone = fakePhone('granted');
  let state = await turnOn(phone, initialReminder, content);
  phone.schedule.set('another', { hour: 9, minute: 0, body: 'x' });
  state = await turnOff(phone, state, content);
  assert.equal(state.on, false);
  assert.equal(phone.schedule.size, 0);
  await sync(phone, state, content);
  assert.equal(phone.schedule.size, 0);
});

test('a phone that says no: no crash, nothing booked, never prompted again, the offer never returns', async () => {
  const phone = fakePhone('undetermined', 'denied');
  let state = await turnOn(phone, markFirstValue(initialReminder), content);
  assert.deepEqual([state.on, state.osDenied, phone.schedule.size, phone.calls.request], [false, true, 0, 1]);
  assert.equal(shouldOffer(state, Date.now() + 365 * DAY), false);
  // The Settings switch tapped again: the permission is re-read, the phone's prompt is not shown again.
  state = await turnOn(phone, state, content);
  assert.equal(phone.calls.request, 1);
  assert.equal(state.on, false);
  // Allowed later in the phone's Settings: the next tap turns it on without a prompt.
  phone.permission = 'granted';
  state = await turnOn(phone, state, content);
  assert.deepEqual([state.on, state.osDenied, phone.schedule.size, phone.calls.request], [true, undefined, 1, 1]);
  // Revoked in the phone's Settings while on: the next open turns it off quietly, without asking.
  phone.permission = 'denied';
  state = await sync(phone, state, content);
  assert.deepEqual([state.on, state.osDenied, phone.schedule.size, phone.calls.request], [false, true, 0, 1]);
});

test('a notification system that throws never crashes and never leaves the switch showing on wrongly', async () => {
  const broken: NotificationsApi = {
    getPermission: async () => { throw new Error('unavailable'); },
    requestPermission: async () => { throw new Error('unavailable'); },
    cancelAll: async () => { throw new Error('unavailable'); },
    scheduleDaily: async () => { throw new Error('unavailable'); },
  };
  const warn = console.warn; console.warn = () => undefined;
  try {
    assert.equal((await turnOn(broken, initialReminder, content)).on, false);
    assert.equal((await sync(broken, { ...initialReminder, on: true }, content)).on, true);
  } finally { console.warn = warn; }
});

test('the pre-ask is never on first launch: only after a finished session, and "Not now" waits at least 7 days', () => {
  const now = Date.UTC(2026, 10, 21);
  assert.equal(shouldOffer(initialReminder, now), false, 'first launch, nothing finished');
  const valued = markFirstValue(initialReminder, now);
  assert.equal(markFirstValue(valued, now + DAY).firstValueAt, now, 'the first value is kept, not moved');
  assert.equal(shouldOffer(valued, now), true);
  const later = notNow(valued, now);
  assert.equal(shouldOffer(later, now + ASK_AGAIN_MS - 1), false);
  assert.equal(shouldOffer(later, now + ASK_AGAIN_MS), true);
  assert.equal(shouldOffer({ ...valued, on: true }, now), false, 'never while it is on');
});

test('saved records are read safely and the default time is an evening one', () => {
  assert.deepEqual(parseReminder(null), initialReminder);
  assert.deepEqual(parseReminder({ on: true, hour: 25, minute: 0 }), { on: true, ...DEFAULT_TIME });
  assert.ok(DEFAULT_TIME.hour >= 18 && DEFAULT_TIME.hour <= 21);
  assert.deepEqual(withTime(initialReminder, 7, 15), { ...initialReminder, hour: 7, minute: 15 });
  assert.deepEqual(withTime(initialReminder, 24, 0), initialReminder, 'an impossible time from a picker changes nothing');
});

test('the reminder words are calm in both languages: no guilt, no streaks, no "you missed"', () => {
  const GUILT = /\b(?:missed|miss|streak|don'?t forget|forgot|lose|losing|behind|again\?|perdiste|olvid|racha|no te pierdas|atrasad)/i;
  for (const copy of [en, es] as unknown as Record<string, unknown>[]) {
    const lines = Object.entries(copy).filter(([key]) => key.startsWith("reminder.")).map(([, line]) => String(line));
    assert.ok(lines.length >= 10);
    for (const line of lines) assert.doesNotMatch(line, GUILT, line);
    assert.ok(!lines.some(line => line.includes('!')), 'no exclamation');
  }
});

test('local only: no code asks for a push token, so nothing leaves the phone and the privacy answers stay as they are', () => {
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true })
    .flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [join(dir, e.name)] : []);
  const files = [...walk('src'), ...walk('app')];
  assert.ok(files.length > 20);
  for (const f of files) assert.doesNotMatch(readFileSync(f, 'utf8'), /get(?:Expo|Device)PushTokenAsync|addPushTokenListener/, f);
  assert.match(readFileSync('app.config.ts', 'utf8'), /'expo-notifications', \{ enableRemoteNotifications: false \}/);
});
