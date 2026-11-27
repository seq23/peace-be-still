// Write your own night, the parts with no screen: the night's schedule (wall clock, quieter each time, bed fade,
// end on time), the saved-nights shelf (20 at most, on the phone, delete removes the recording first), the gate
// (paid adults only) and the one home of every number.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { canUse } from '../src/gates';
import { OWN_NIGHT_MINUTES, RECORDING_MAX_SECONDS, SAVED_NIGHTS_MAX, SCENE_MESSAGE_COST } from '../src/ownNight/limits';
import { BED_FADE_S, BED_VOLUME, GAP_END_S, GAP_START_S, LEAD_IN_S, VOICE_END, VOICE_FAILS_MAX, VOICE_START, bedVolumeAt, createNight, spokenSeconds, voiceVolumeAt } from '../src/ownNight/night';
import { createSavedNights, parseNights, SAVED_NIGHTS_KEY, type SavedNight } from '../src/ownNight/saved';

function fakeNight(sayS = 10, failing = false) {
  let clock = 1_000_000;
  let tick: (() => void) | null = null;
  const bed: number[] = [];
  const events: string[] = [];
  const said: Array<{ at: number; volume: number }> = [];
  let finished = 0;
  let pending: (() => void) | null = null;
  const night = createNight({
    now: () => clock, sayS,
    every: fn => { tick = fn; return () => { tick = null; }; },
    bed: { start: v => { events.push('bed:start'); bed.push(v); }, setVolume: v => bed.push(v), stop: () => events.push('bed:stop') },
    voice: {
      say: volume => { said.push({ at: clock, volume }); return failing ? Promise.reject(new Error('no voice')) : new Promise<void>(resolve => { pending = resolve; }); },
      stop: () => events.push('voice:stop'),
    },
    onFinish: () => { finished++; },
  });
  /** Moves the clock in 1 s ticks; a saying ends sayS seconds after it started. */
  async function run(seconds: number) {
    for (let i = 0; i < seconds; i++) {
      clock += 1000;
      if (pending && said.length && clock - said.at(-1)!.at >= sayS * 1000) { const p = pending; pending = null; p(); await Promise.resolve(); await Promise.resolve(); }
      tick?.();
      await Promise.resolve();
    }
  }
  return { night, run, bed, said, events, get finished() { return finished; }, get ticking() { return tick !== null; }, setClock: (ms: number) => { clock += ms; }, start: () => clock };
}

test('a 20-minute night: bed from the start, the moment after the lead-in, quieter each time, gaps growing, ends on time', async () => {
  const f = fakeNight(10);
  f.night.start(20);
  assert.equal(f.bed[0], BED_VOLUME);
  assert.equal(f.said.length, 0, 'nothing said during the lead-in');
  await f.run(20 * 60 + 2);
  assert.ok(f.said.length >= 8 && f.said.length <= 20, `said ${f.said.length} times`);
  const first = f.said[0];
  assert.ok(first.at - 1_000_000 >= LEAD_IN_S * 1000);
  for (let i = 1; i < f.said.length; i++) assert.ok(f.said[i].volume < f.said[i - 1].volume, 'each saying quieter than the last');
  assert.ok(f.said[0].volume <= VOICE_START && f.said.at(-1)!.volume >= VOICE_END);
  const gaps = f.said.slice(1).map((s, i) => (s.at - f.said[i].at) / 1000 - 10);
  assert.ok(gaps[0] >= GAP_START_S - 1 && gaps.at(-1)! <= GAP_END_S + 1 && gaps.at(-1)! > gaps[0], `gaps ${gaps.join(',')}`);
  // Nothing is said once the bed has started to fade, and the night has stopped by itself.
  assert.ok(f.said.every(s => (s.at - 1_000_000) / 1000 + 10 <= 20 * 60 - BED_FADE_S + 1));
  assert.equal(f.night.getState().playing, false);
  assert.equal(f.night.getState().finished, true);
  assert.equal(f.finished, 1);
  assert.ok(f.events.includes('bed:stop') && !f.ticking);
});

test('the bed fades over the last minute and is silent at the end', () => {
  assert.equal(bedVolumeAt(0, 1200), BED_VOLUME);
  assert.equal(bedVolumeAt(1200 - BED_FADE_S, 1200), BED_VOLUME);
  assert.ok(Math.abs(bedVolumeAt(1200 - BED_FADE_S / 2, 1200) - BED_VOLUME / 2) < 1e-9);
  assert.equal(bedVolumeAt(1200, 1200), 0);
  assert.equal(voiceVolumeAt(0, 1200), VOICE_START);
  assert.ok(Math.abs(voiceVolumeAt(1200, 1200) - VOICE_END) < 1e-9);
});

test('every length she can pick ends at its own length (20, 45, 90)', async () => {
  for (const minutes of OWN_NIGHT_MINUTES) {
    const f = fakeNight(6);
    f.night.start(minutes);
    await f.run(minutes * 60 - 2);
    assert.equal(f.night.getState().playing, true, `${minutes} still playing just before its end`);
    await f.run(3);
    assert.equal(f.night.getState().playing, false, `${minutes} stopped at its end`);
  }
});

test('a phone that slept past the end stops the night when it wakes (wall clock, not ticks)', async () => {
  const f = fakeNight(10);
  f.night.start(20);
  f.setClock(25 * 60 * 1000);
  f.night.foreground();
  assert.equal(f.night.getState().playing, false);
  assert.equal(f.finished, 1);
});

test('a voice that keeps failing stops trying after VOICE_FAILS_MAX and says so; the bed plays on to the end', async () => {
  const f = fakeNight(5, true);
  f.night.start(20);
  await f.run(15 * 60);
  assert.equal(f.said.length, VOICE_FAILS_MAX);
  assert.equal(f.night.getState().error, 'voice');
  assert.equal(f.night.getState().playing, true);
});

test('stopping early is not a finished night', async () => {
  const f = fakeNight(10);
  f.night.start(45);
  await f.run(30);
  f.night.stop();
  assert.equal(f.finished, 0);
  assert.ok(f.events.includes('voice:stop') && f.events.includes('bed:stop'));
});

test('the phone voice estimate grows with the moment', () => {
  assert.ok(spokenSeconds('one two three') < spokenSeconds('one two three four five six seven eight nine ten eleven twelve'));
});

const night = (i: number, over: Partial<SavedNight> = {}): SavedNight => ({
  id: `n${i}`, scene: `I am home. Night ${i} is quiet.`, wish: 'TEST wish', who: '', lang: 'en', minutes: 45, voice: 'phone', savedAt: i, ...over,
});
function shelf(failRemove = false) {
  const data = new Map<string, string>();
  const removed: string[] = [];
  const s = createSavedNights({ getItem: async k => data.get(k) ?? null, setItem: async (k, v) => { data.set(k, v); } },
    async uri => { if (failRemove) throw new Error('locked'); removed.push(uri); });
  return { s, data, removed };
}

test('saved nights: up to SAVED_NIGHTS_MAX; the next new one is refused (never pushes one out), an edit still saves', async () => {
  const { s } = shelf();
  for (let i = 0; i < SAVED_NIGHTS_MAX; i++) assert.equal((await s.save(night(i))).ok, true, `night ${i}`);
  const over = await s.save(night(99));
  assert.deepEqual(over, { ok: false, reason: 'full' });
  assert.equal((await s.list()).length, SAVED_NIGHTS_MAX);
  const edit = await s.save(night(3, { scene: 'I am home and it is done. The lamp is warm.' }));
  assert.equal(edit.ok, true);
  assert.equal((await s.list()).find(n => n.id === 'n3')?.scene, 'I am home and it is done. The lamp is warm.');
  assert.equal((await s.list()).length, SAVED_NIGHTS_MAX);
});

test('deleting a night deletes its recording file first; a file that will not delete keeps the night listed', async () => {
  const ok = shelf();
  await ok.s.save(night(1, { voice: 'mine', recording: 'file:///docs/own-nights/n1.m4a', recordingSeconds: 9 }));
  const done = await ok.s.remove('n1');
  assert.equal(done.ok, true);
  assert.deepEqual(ok.removed, ['file:///docs/own-nights/n1.m4a']);
  assert.deepEqual(await ok.s.list(), []);
  const stuck = shelf(true);
  await stuck.s.save(night(2, { voice: 'mine', recording: 'file:///docs/own-nights/n2.m4a', recordingSeconds: 9 }));
  assert.deepEqual(await stuck.s.remove('n2'), { ok: false, reason: 'failed' });
  assert.equal((await stuck.s.list()).length, 1);
});

test('an edit that replaces the recording deletes the old file; switching to the phone voice deletes it too', async () => {
  const { s, removed } = shelf();
  await s.save(night(1, { voice: 'mine', recording: 'file:///a.m4a', recordingSeconds: 9 }));
  await s.save(night(1, { voice: 'mine', recording: 'file:///b.m4a', recordingSeconds: 8 }));
  assert.deepEqual(removed, ['file:///a.m4a']);
  await s.save(night(1, { voice: 'phone', recording: undefined, recordingSeconds: undefined }));
  assert.deepEqual(removed, ['file:///a.m4a', 'file:///b.m4a']);
});

test('nothing invalid is saved or read back: my voice needs a recording, sizes are capped, junk is dropped', async () => {
  const { s, data } = shelf();
  assert.deepEqual(await s.save(night(1, { voice: 'mine' })), { ok: false, reason: 'invalid' });
  assert.deepEqual(await s.save(night(1, { voice: 'mine', recording: 'file:///x.m4a', recordingSeconds: RECORDING_MAX_SECONDS + 1 })), { ok: false, reason: 'invalid' });
  assert.deepEqual(await s.save(night(1, { scene: '   ' })), { ok: false, reason: 'invalid' });
  assert.deepEqual(await s.save(night(1, { minutes: 30 as never })), { ok: false, reason: 'invalid' });
  data.set(SAVED_NIGHTS_KEY, JSON.stringify([night(1), { id: 'x' }, 'junk', night(2, { lang: 'fr' as never })]));
  assert.deepEqual((await s.list()).map(n => n.id), ['n1']);
  assert.deepEqual(parseNights('not json'), []);
});

test('the gate: paid adults only; a paid teen, a child or an unknown age never gets it', () => {
  assert.equal(canUse('ownNight', { paid: true, age: 'adult' }), true);
  assert.equal(canUse('ownNight', { paid: false, age: 'adult' }), false);
  for (const age of ['teen', 'child', null] as const) assert.equal(canUse('ownNight', { paid: true, age }), false, String(age));
});

const walk = (dir: string): string[] => readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? (['node_modules', 'test'].includes(name) ? [] : walk(path)) : [path];
});
test('every number has one home: the lengths, the saved-night limit and the message cost live only in limits.ts', () => {
  const files = [...walk('src'), ...walk('app'), ...walk('../worker/src')].filter(f => /\.(ts|tsx)$/.test(f) && !f.endsWith('ownNight/limits.ts'));
  const offenders = files.filter(f => /\[\s*20\s*,\s*45\s*,\s*90\s*\]|SAVED_NIGHTS_MAX\s*=|SCENE_MESSAGE_COST\s*=|OWN_NIGHT_MINUTES\s*=/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(offenders, []);
  const worker = readFileSync('../worker/src/ownNight.ts', 'utf8');
  assert.match(worker, /from '\.\.\/\.\.\/app\/src\/ownNight\/limits'/);
  assert.match(worker, /SCENE_MESSAGE_COST/);
  assert.equal(SCENE_MESSAGE_COST, 1);
  assert.deepEqual([...OWN_NIGHT_MINUTES], [20, 45, 90]);
  assert.equal(SAVED_NIGHTS_MAX, 20);
});

// "Never uploaded" (privacy policy, the microphone question, the editor): the own-nights folder is kept out of
// iCloud and device backups before anything is written into it, and nothing is written when it cannot be.
test('own nights are kept out of backups before anything is written, and nothing is written when they cannot be', async () => {
  const { createShelf, NIGHTS_FILE } = await import('../src/ownNight/shelf');
  const log: string[] = [];
  const disk = new Map<string, string>();
  const files = (marks: boolean) => ({
    ensureFolder: () => { log.push('folder'); },
    excludeFolder: () => { log.push(`exclude:${marks}`); return marks; },
    read: (name: string) => disk.get(name) ?? null,
    write: (name: string, text: string) => { log.push(`write:${name}`); disk.set(name, text); },
  });
  const ok = createShelf(files(true));
  const shelf = createSavedNights(ok.storage, async () => undefined);
  assert.equal((await shelf.save(night(1))).ok, true);
  assert.deepEqual(log.slice(0, 2), ['folder', 'exclude:true'], 'the folder is marked before the first write');
  assert.ok(log.indexOf('exclude:true') < log.indexOf(`write:${NIGHTS_FILE}`));
  assert.equal(parseNights(disk.get(NIGHTS_FILE) ?? null).length, 1, 'the night is in the folder file, not elsewhere');
  // The mark cannot be set or read back: no write, the save says it failed, and a recording is not moved in.
  log.length = 0; disk.clear();
  const refused = createShelf(files(false));
  assert.deepEqual(await createSavedNights(refused.storage, async () => undefined).save(night(2)), { ok: false, reason: 'failed' });
  assert.ok(!log.some(l => l.startsWith('write:')), `wrote while not out of backups: ${log.join(', ')}`);
  assert.throws(() => refused.ready(), /BACKUP_EXCLUDE_FAILED/);
  await assert.rejects(ok.storage.setItem('peace-be-still-settings', '{}'), /NOT_A_NIGHTS_KEY/);
});

test('the phone build keeps own nights in the excluded folder, and Android leaves that folder out of backup', async () => {
  const adapters = readFileSync(new URL('../src/ownNight/adapters.ts', import.meta.url), 'utf8');
  // Saved nights on a phone go through the shelf; the browser store is for the web preview only.
  assert.match(adapters, /const nightStorage = \(\) => \(Platform\.OS === 'web' \? AsyncStorage : shelf\.storage\);/);
  assert.match(adapters, /export function keepRecording[\s\S]{0,80}shelf\.ready\(\);/, 'a recording is moved in only after the folder is marked');
  // An iPhone binary without the backup mark never shows the feature (an over-the-air update could reach one).
  assert.match(adapters, /Platform\.OS !== 'ios' \|\| !!backupExclude\(\)/);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const plugin = require('../plugins/own-night-backup.js');
  for (const xml of Object.values(plugin.FILES) as string[]) assert.match(xml, /<exclude domain="file" path="own-nights\/" \/>/);
  assert.match(plugin.FILES['pbs_data_extraction_rules.xml'], /<cloud-backup>[\s\S]*own-nights[\s\S]*<\/cloud-backup>\s*<device-transfer>[\s\S]*own-nights[\s\S]*<\/device-transfer>/);
  assert.ok(!(Object.values(plugin.FILES) as string[]).some(x => /<include/.test(x)), 'an include rule would drop the rest of the app from backup');
  const manifest = { manifest: { application: [{ $: { 'android:allowBackup': 'true' } }] } };
  plugin.setBackupRules(manifest);
  assert.equal(manifest.manifest.application[0].$['android:fullBackupContent'], '@xml/pbs_backup_rules');
  assert.equal(manifest.manifest.application[0].$['android:dataExtractionRules'], '@xml/pbs_data_extraction_rules');
  assert.throws(() => plugin.setBackupRules({ manifest: { application: [{ $: { 'android:fullBackupContent': '@xml/other' } }] } }), /OWN_NIGHT_BACKUP_RULES_TAKEN/);
  const root = (await import('node:fs')).mkdtempSync(join((await import('node:os')).tmpdir(), 'pbs-android-'));
  plugin.writeRuleFiles(root);
  for (const [file, xml] of Object.entries(plugin.FILES)) assert.equal(readFileSync(join(root, 'app/src/main/res/xml', file), 'utf8'), xml);
  const config = readFileSync(new URL('../app.config.ts', import.meta.url), 'utf8');
  assert.match(config, /'\.\/plugins\/own-night-backup'/);
});
