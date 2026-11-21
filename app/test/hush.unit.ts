// "3 AM, back to sleep" and the grief nights, the rules on their own (her brief 21 Nov 2026), with a fake clock.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { inSmallHours } from '../src/clock';
import { backToSleepTrack, isBackToSleep } from '../src/screens/listen/hush';
import { shelfOf, trackBelongsToDoor } from '../src/screens/listen/catalog';
import { isSleepSession } from '../src/screens/listen/nights';
import { buildLibrary } from '../src/player/build-library';
import type { Track } from '../src/player/library';

const at = (h: number, m = 0) => new Date(2026, 10, 21, h, m);
const night = (journey: Track['journey'], lang: 'en' | 'es' = 'en', n = 'a'): Track => ({
  file: `${lang}/psalm-night/${journey ?? 'pn'}-${n}.m4a`, kind: 'psalm-night', lang, seconds: 360, sha256: n.repeat(64), voice: 'kokoro:af_nicole',
  ref: `content/psalm-nights/${lang}/${journey ?? 'pn'}.json#x`, titles: { [lang]: 'Night' }, ...(journey ? { journey } : {}),
});

test('the small hours are 12 AM to 4:59 AM, phone time: never 10 PM, 11:59 PM, 5 AM or 6 AM', () => {
  for (const [h, m] of [[0, 0], [1, 30], [3, 0], [4, 59]]) assert.ok(inSmallHours(at(h, m)), `${h}:${m}`);
  for (const [h, m] of [[22, 0], [23, 59], [5, 0], [6, 0], [12, 0], [21, 0]]) assert.ok(!inSmallHours(at(h, m)), `${h}:${m}`);
});

test('the back-to-sleep button is offered at 3 AM only, only when published, only on the God\'s Word door, in her language', () => {
  const back = night('back-to-sleep'), es = night('back-to-sleep', 'es', 'b'), psalm = night(undefined, 'en', 'c');
  const tracks = [psalm, back, es];
  const published = (t: Track) => t !== es;
  assert.equal(backToSleepTrack(tracks, 'en', 'faith', at(3), published), back);
  assert.equal(backToSleepTrack(tracks, 'en', 'faith', at(22), published), null, '10 PM');
  assert.equal(backToSleepTrack(tracks, 'en', 'faith', at(6), published), null, '6 AM');
  assert.equal(backToSleepTrack(tracks, 'en', 'faith', at(5), published), null, '5 AM');
  assert.equal(backToSleepTrack(tracks, 'en', 'faith', at(3), () => false), null, 'voiced but not published');
  assert.equal(backToSleepTrack(tracks, 'es', 'faith', at(3), published), null, 'the Spanish file is not published');
  assert.equal(backToSleepTrack(tracks, 'en', 'mindset', at(3), published), null, 'the Mindset door never sees a psalm');
  assert.equal(backToSleepTrack([psalm], 'en', 'faith', at(3), () => true), null, 'a Psalm Night is never the button');
});

test('the back-to-sleep night is free and never spends a night; grief nights follow the sleep-night rule on their own shelf', () => {
  assert.ok(isBackToSleep(night('back-to-sleep')) && !isBackToSleep(night('grief')));
  assert.equal(isSleepSession(night('back-to-sleep')), false);
  assert.equal(isSleepSession(night('grief')), true);
  assert.equal(isSleepSession(night(undefined)), true);
  assert.deepEqual([shelfOf(night('grief')), shelfOf(night('back-to-sleep')), shelfOf(night(undefined))], ['grief', 'backToSleep', 'psalms']);
  for (const j of ['grief', 'back-to-sleep'] as const) {
    assert.ok(trackBelongsToDoor(night(j), 'faith'));
    assert.ok(!trackBelongsToDoor(night(j), 'mindset'));
  }
});

test('a voiced grief or back-to-sleep row gets its journey from its script; a Psalm Night gets none', () => {
  const row = (id: string, lang = 'en') => JSON.stringify({ file: `${lang}/psalm-night/${id}-0000abcd.m4a`, kind: 'psalm-night', lang,
    ref: `content/psalm-nights/${lang}/${id}.json#${id}`, seconds: 400, sha256: 'f'.repeat(64), voice: 'kokoro:af_nicole', status: 'passed' });
  const { tracks } = buildLibrary([row('gn-01-psalm-13'), row('bs-01-psalm-4', 'es'), row('pn-01-psalm-23')].join('\n'));
  assert.deepEqual(tracks.map(t => t.journey), ['grief', 'back-to-sleep', undefined]);
  assert.equal(tracks[1].scriptureRef, 'PSA 4:8');
  assert.equal(tracks[1].titles.es, 'Para volver a dormir: En paz me acostaré');
});
