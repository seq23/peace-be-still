// Lane 5N: the night rules on their own (the first night free, then one a week; a night runs 6 AM to 6 AM).
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { canUse } from '../src/gates';
import { isSleepSession, nextFreeNight, nightOf, previewNights, recordNight, sleepUsage, parseLog } from '../src/screens/listen/nights';

const at = (d: number, h = 21) => new Date(2026, 10, d, h);
const free = (log: string[], now: Date, paid = false) => canUse('sleepSession', { paid, age: 'adult', ...sleepUsage(log, now) });

test('a session after midnight belongs to the evening before', () => {
  assert.equal(nightOf(at(21, 1)), '2026-11-20');
  assert.equal(nightOf(at(21, 6)), '2026-11-21');
  assert.equal(nightOf(at(21, 23)), '2026-11-21');
});

test('the first night, then one a week: replays the same night are free, the 8th night after the weekly one is free again', () => {
  let log: string[] = [];
  assert.ok(free(log, at(2)));
  log = recordNight(log, at(2));
  assert.ok(free(log, at(2, 23)), 'same night again');
  assert.ok(free(log, at(3)), 'the first weekly night');
  log = recordNight(log, at(3));
  assert.ok(free(log, at(4, 2)), 'still the night of the 3rd');
  assert.ok(!free(log, at(4)));
  assert.ok(!free(log, at(9)));
  assert.equal(nextFreeNight(log, at(4)).getDate(), 10);
  assert.ok(free(log, at(10)));
  assert.ok(free(log, at(4), true), 'paid: every night');
  assert.equal(recordNight(log, at(3, 22)), log, 'a night is counted once');
});

test('only whispered sleep sessions count; a broken log is read as empty, never as a lock', () => {
  assert.ok(isSleepSession({ kind: 'psalm-night' }) && isSleepSession({ kind: 'imagination-night' }));
  assert.ok(!isSleepSession({ kind: 'psalms' }) && !isSleepSession({ kind: 'bible' }) && !isSleepSession({ kind: 'stories' }));
  assert.deepEqual(parseLog('{"door":"faith"}'), []);
  assert.deepEqual(parseLog('not json'), []);
  assert.deepEqual(parseLog('["2026-11-02", 4]'), ['2026-11-02']);
});

test('the web preview switch: ?nights=used is a used week, ?nights=new clears, nothing outside the preview', () => {
  const g = globalThis as { location?: { search: string } };
  const now = at(21);
  try {
    g.location = { search: '?nights=used' };
    assert.equal(previewNights(now, false), null);
    const used = previewNights(now, true) as string[];
    assert.ok(!free(used, now), 'a used week is locked tonight');
    g.location = { search: '?nights=new' };
    assert.equal(previewNights(now, true), 'clear');
    g.location = { search: '' };
    assert.equal(previewNights(now, true), null);
  } finally { delete g.location; }
});
