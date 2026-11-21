import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, mock, test } from 'node:test';
import { buildLibrary, keyScripture, MANIFEST, REPO } from '../src/player/build-library';
import { createDimmer } from '../src/player/dimmer';
import { createDownloads, type DownloadFiles } from '../src/player/downloads';
import { audioBaseUrl, hasCallAndResponse, onePerScript, readManifest, trackTitle, type Track } from '../src/player/library';
import { createPlayer, FADE_MS, LOAD_WAIT_MS, type AudioOutput, type AudioStatus, type Store } from '../src/player/player';

const BASE = 'https://audio.test/';
const PAID = { paid: true };
const FREE = { paid: false };
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

beforeEach(() => mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'], now: 1_700_000_000_000 }));
afterEach(() => mock.timers.reset());

function track(over: Partial<Track> = {}): Track {
  return { file: 'en/psalms/kjv-psa-023.m4a', kind: 'psalms', lang: 'en', ref: 'PSA 23', seconds: 600, sha256: 'a'.repeat(64), voice: 'kokoro:af_nicole', titles: { en: 'Psalm 23', es: 'Salmo 23' }, ...over };
}

/**
 * An output whose position moves with the (mocked) wall clock while it plays. Like iOS, a seek before the
 * source reports loaded is dropped. `autoLoad` reports loaded on the next microtask; otherwise call loaded().
 * outsidePause/outsidePlay are the lock screen, a call or AirPods acting on the native player directly.
 */
function fakeAudio({ autoLoad = true } = {}) {
  let startedAt: number | null = null;
  let base = 0;
  let ready = false;
  const listeners = new Set<(status: AudioStatus) => void>();
  const emit = (didJustFinish = false) => queueMicrotask(() => {
    for (const l of listeners) l({ playing: startedAt !== null, isLoaded: ready, didJustFinish });
  });
  const audio = {
    uri: null as string | null, volume: 1, seeks: [] as number[], seekPermissions: [] as boolean[], titles: [] as string[], disposed: false,
    load(uri: string, title: string, allowSeek: boolean) {
      audio.seekPermissions.push(allowSeek);
      audio.uri = uri; audio.titles.push(title); base = 0; startedAt = null; ready = false;
      if (autoLoad) queueMicrotask(() => audio.loaded());
    },
    loaded() { ready = true; emit(); },
    loadedSilently() { ready = true; },
    play() { if (startedAt === null) { startedAt = Date.now(); emit(); } },
    pause() { if (startedAt !== null) { base += (Date.now() - startedAt) / 1000; startedAt = null; emit(); } },
    async seekTo(seconds: number) { if (!ready) return; base = seconds; if (startedAt !== null) startedAt = Date.now(); audio.seeks.push(seconds); },
    get isLoaded() { return ready; },
    get currentTime() { return base + (startedAt === null ? 0 : (Date.now() - startedAt) / 1000); },
    get isPlaying() { return startedAt !== null; },
    onStatus(listener: (status: AudioStatus) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    outsidePause() { audio.pause(); },
    outsidePlay() { audio.play(); },
    finish() { startedAt = null; emit(true); },
    dispose() { audio.disposed = true; },
  };
  return audio satisfies AudioOutput;
}

function memoryStore(): Store & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: async (key) => data.get(key) ?? null,
    setItem: async (key, value) => { data.set(key, value); },
    removeItem: async (key) => { data.delete(key); },
  };
}

function fakeFiles(body: (url: string) => string | Error = () => 'a'.repeat(64)) {
  const files = new Map<string, string>();
  const api: DownloadFiles = {
    exists: (name) => files.has(name),
    uri: (name) => `file:///audio/${name}`,
    async download(url, name) { const result = body(url); if (result instanceof Error) { files.set(name, 'partial'); throw result; } files.set(name, result); },
    async sha256(name) { return files.get(name)!; },
    async move(from, to) { files.set(to, files.get(from)!); files.delete(from); },
    remove: (name) => { files.delete(name); },
  };
  return { files, api };
}

function setup({ baseUrl = BASE as string | null, store = memoryStore(), files = fakeFiles(), autoLoad = true } = {}) {
  const audio = fakeAudio({ autoLoad });
  const downloads = createDownloads(files.api);
  const player = createPlayer({ audio, store, downloads, baseUrl, lang: 'en' });
  return { audio, store, files, downloads, player };
}

// ── library ──────────────────────────────────────────────────────────────

test('the real manifest yields one track for every passed row, with readable titles and no Drive data', () => {
  const passed = readFileSync(MANIFEST, 'utf8').split('\n').filter((line) => line.trim() && JSON.parse(line).status === 'passed').length;
  assert.ok(passed > 0, 'manifest has passed rows');
  const { tracks, skipped } = buildLibrary();
  assert.equal(tracks.length, passed);
  assert.deepEqual(skipped, []);
  for (const t of tracks) {
    for (const lang of ['en', 'es'] as const) {
      const title = trackTitle(t, lang);
      assert.ok(title, `${t.file} has a title`);
      assert.doesNotMatch(title, /\/|\.json|\b[1-3]?[A-Z]{3}\b/, `${t.file} title "${title}" is readable`);
    }
    const fields = ['file', 'kind', 'lang', 'ref', 'seconds', 'sha256', 'titles', 'voice'];
    if (hasCallAndResponse(t)) {
      fields.push('responsePauses', 'scriptureRef');
      const story = JSON.parse(readFileSync(`${REPO}/${t.ref}`, 'utf8'));
      // The key verse is the one the call and response answers: the last Scripture before it.
      const call = story.blocks.findIndex((block: { type: string }) => block.type === 'call_response');
      const before = story.blocks.slice(0, call).filter((block: { type: string }) => block.type === 'scripture');
      assert.ok(call > 0 && before.length, `${t.ref} has Scripture before its call and response`);
      assert.equal(t.scriptureRef, before.at(-1).ref);
    }
    if (t.kind === 'psalm-night') {
      // A Psalm Night shows its psalm under the title: the script's own `main` reference.
      fields.push('scriptureRef');
      const script = JSON.parse(readFileSync(`${REPO}/${t.ref.split('#')[0]}`, 'utf8'));
      assert.equal(t.scriptureRef, script.main[0]);
    }
    assert.deepEqual(Object.keys(t).sort(), fields.sort(), `${t.kind} ${t.ref}`);
  }
});

test('a story shows the verse its call and response answers, else its first Scripture, else none', () => {
  const s = (ref: string) => ({ type: 'scripture', ref });
  const call = { type: 'call_response' };
  assert.equal(keyScripture([s('MAR 4:37'), { type: 'retelling' }, s('MAR 4:39'), call, s('MAR 4:40')]), 'MAR 4:39');
  assert.equal(keyScripture([s('RUT 1:8'), s('RUT 1:16')]), 'RUT 1:8');
  assert.equal(keyScripture([call, s('GEN 1:1')]), 'GEN 1:1');
  assert.equal(keyScripture([{ type: 'retelling' }]), undefined);
  assert.equal(keyScripture(undefined), undefined);
});

test('a bad passed row is held and the rest ship; failed rows never ship', () => {
  const good = { file: 'en/psalms/kjv-psa-001.m4a', kind: 'psalms', lang: 'en', ref: 'PSA 1', seconds: 80, sha256: 'b'.repeat(64), voice: 'v', status: 'passed' };
  const jsonl = [good, { ...good, file: '../x' }, { ...good, file: 'en/psalms/kjv-psa-002.m4a', status: 'FAILED' }].map((r) => JSON.stringify(r)).join('\n') + '\n{not json';
  const { tracks, skipped } = readManifest(jsonl, () => null);
  assert.deepEqual(tracks.map((t) => t.file), [good.file]);
  assert.deepEqual(skipped.map((s) => s.line), [2, 4]);
});

test('a manifest with nothing playable stops with AUDIO_LIBRARY_EMPTY', () => {
  const bad = JSON.stringify({ file: '../x', kind: 'psalms', lang: 'en', ref: 'PSA 1', seconds: 80, sha256: 'b'.repeat(64), voice: 'v', status: 'passed' });
  assert.throws(() => readManifest(bad, () => null), { code: 'AUDIO_LIBRARY_EMPTY' });
});

test('a story gets its own title; a story with no readable title is held', () => {
  const row = { file: 'stories/hush-harbor/en/x.m4a', kind: 'stories', lang: 'en', ref: 'content/stories/hush-harbor/x.json', seconds: 200, sha256: 'c'.repeat(64), voice: 'v', status: 'passed' };
  const jsonl = JSON.stringify(row) + '\n' + JSON.stringify({ ...row, file: 'stories/hush-harbor/en/y.m4a' });
  const { tracks, skipped } = readManifest(jsonl, (r) => (r.file.endsWith('x.m4a') ? { titles: { en: 'Peace, Be Still' } } : null));
  assert.equal(trackTitle(tracks[0], 'es'), 'Peace, Be Still');
  assert.equal(skipped.length, 1);
});

const night = { file: 'en/imagination-night/in-01-aaaa1111.m4a', kind: 'imagination-night', lang: 'en', ref: 'content/imagination-nights/en/in-01.json#in-01', seconds: 1029, sha256: 'd'.repeat(64), voice: 'v', status: 'passed' };
const nightTitles = () => ({ titles: { en: 'Living in the End', es: 'Vivir desde el final' } });

test('a re-voiced script: the newest playable file is shown, never one hidden by a newer file not yet in R2', () => {
  const longer = { ...night, file: 'en/imagination-night/in-01-bbbb2222.m4a', seconds: 1115, sha256: 'e'.repeat(64) };
  const spanish = { ...night, lang: 'es', file: 'es/imagination-night/in-01-cccc3333.m4a', ref: 'content/imagination-nights/es/in-01.json#in-01' };
  const { tracks } = readManifest([night, longer, spanish].map(r => JSON.stringify(r)).join('\n'), nightTitles);
  assert.deepEqual(tracks.map(t => t.file), [night.file, longer.file, spanish.file], 'the library keeps every passed file');
  const live = (...files: string[]) => (t: { file: string }) => files.includes(t.file);
  // Old published + new unpublished -> the old one; both published -> the new one; neither -> the newest (shown as not ready).
  assert.deepEqual(onePerScript(tracks, live(night.file, spanish.file)).map(t => t.file), [night.file, spanish.file]);
  assert.deepEqual(onePerScript(tracks, live(night.file, longer.file)).map(t => t.file), [longer.file, spanish.file]);
  assert.deepEqual(onePerScript(tracks, live()).map(t => t.file), [longer.file, spanish.file]);
});

test('a re-voiced script whose new file failed keeps its old published file listed', () => {
  const failed = { ...night, file: 'en/imagination-night/in-01-bbbb2222.m4a', sha256: 'e'.repeat(64), status: 'FAILED' };
  const { tracks } = readManifest([night, failed].map(r => JSON.stringify(r)).join('\n'), nightTitles);
  assert.deepEqual(onePerScript(tracks, t => t.file === night.file).map(t => t.file), [night.file]);
});

test('the audio base URL must be https; anything else is the CONFIG_AUDIO_BASE_URL stop', () => {
  assert.equal(audioBaseUrl('https://audio.example.org/lib'), 'https://audio.example.org/lib/');
  for (const value of [undefined, null, '', 'http://audio.example.org', 'not a url']) assert.equal(audioBaseUrl(value), null);
});

// ── playing ──────────────────────────────────────────────────────────────

test('plays the track from the audio host at the manifest file path, titled for the lock screen', async () => {
  const { audio, player } = setup();
  await player.play(track(), FREE);
  assert.equal(audio.uri, 'https://audio.test/en/psalms/kjv-psa-023.m4a');
  assert.deepEqual(audio.titles, ['Psalm 23']);
  assert.equal(player.getState().playing, true);
});

test('with no audio host it shows not-ready and plays nothing', async () => {
  const { audio, player } = setup({ baseUrl: null });
  await player.play(track(), FREE);
  assert.equal(audio.uri, null);
  assert.equal(player.getState().error, 'audio-not-ready');
  assert.equal(player.getState().playing, false);
});

test('a slow start that is overtaken by pause never begins playing', async () => {
  let release!: () => void;
  const store = memoryStore();
  const slow: Store = { ...store, getItem: (key) => new Promise((resolve) => { release = () => resolve(store.data.get(key) ?? null); }) };
  const { audio, player } = setup({ store: slow as Store & { data: Map<string, string> } });
  const playing = player.play(track(), FREE);
  await player.pause();
  release();
  await playing;
  assert.equal(audio.isPlaying, false);
  assert.equal(player.getState().playing, false);
});

// ── sleep timer ──────────────────────────────────────────────────────────

test('sleep timer fades over the last 30 seconds, then pauses; the next play is full volume', async () => {
  const { audio, player } = setup();
  await player.play(track({ seconds: 3600 }), FREE);
  player.setSleepTimer(15);
  mock.timers.tick(15 * 60_000 - FADE_MS);
  assert.equal(audio.volume, 1);
  mock.timers.tick(15_000);
  assert.ok(Math.abs(audio.volume - 0.5) < 0.05, `volume ${audio.volume} is about half`);
  mock.timers.tick(15_000);
  assert.equal(audio.volume, 0);
  assert.equal(audio.isPlaying, false);
  assert.equal(player.getState().sleepEndsAt, null);
  await player.play(track({ seconds: 3600 }), FREE);
  assert.equal(audio.volume, 1);
});

test('turning the timer off mid-fade restores full volume and keeps playing', async () => {
  const { audio, player } = setup();
  await player.play(track({ seconds: 3600 }), FREE);
  player.setSleepTimer(30);
  mock.timers.tick(30 * 60_000 - 10_000);
  assert.ok(audio.volume < 0.5);
  player.setSleepTimer(null);
  assert.equal(audio.volume, 1);
  mock.timers.tick(60_000);
  assert.equal(audio.isPlaying, true);
});

test('the timer only takes 15, 30, 45 or 60 minutes', () => {
  const { player } = setup();
  for (const minutes of [15, 30, 45, 60] as const) player.setSleepTimer(minutes);
  assert.throws(() => player.setSleepTimer(20 as 15));
});

test('a deadline that passed while the phone suspended the app stops audio on return', async () => {
  const { audio, player } = setup();
  await player.play(track({ seconds: 3600 }), FREE);
  player.setSleepTimer(15);
  mock.timers.setTime(Date.now() + 20 * 60_000);
  player.foreground();
  assert.equal(audio.isPlaying, false);
  assert.equal(player.getState().playing, false);
});

// ── resume position ──────────────────────────────────────────────────────

test('her place is saved while playing and restored by a new player after the app is closed', async () => {
  const store = memoryStore();
  const first = setup({ store });
  await first.player.play(track(), FREE);
  mock.timers.tick(120_000);
  await flush();
  await first.player.dispose();
  const second = setup({ store });
  await second.player.play(track(), FREE);
  assert.deepEqual(second.audio.seeks, [120]);
});

test('pausing and backgrounding save the exact spot', async () => {
  const store = memoryStore();
  const first = setup({ store });
  await first.player.play(track(), FREE);
  mock.timers.tick(47_000);
  await first.player.background();
  const second = setup({ store });
  await second.player.play(track(), FREE);
  assert.deepEqual(second.audio.seeks, [47]);
});

test('a spot in the last 10 seconds, or a finished track, starts again from the top', async () => {
  const store = memoryStore();
  const first = setup({ store });
  await first.player.play(track({ seconds: 100 }), FREE);
  mock.timers.tick(95_000);
  await first.player.pause();
  const second = setup({ store });
  await second.player.play(track({ seconds: 100 }), FREE);
  assert.deepEqual(second.audio.seeks, []);
  second.audio.finish();
  await flush();
  assert.equal(store.data.size, 0);
});

test('the saved spot is applied only after the track reports loaded', async () => {
  const store = memoryStore();
  store.data.set('pbs.player.position:en/psalms/kjv-psa-023.m4a', JSON.stringify({ positionSeconds: 120 }));
  const { audio, player } = setup({ store, autoLoad: false });
  const playing = player.play(track(), FREE);
  await flush();
  assert.equal(audio.isPlaying, false, 'waits for the load before playing');
  audio.loaded();
  await playing;
  assert.deepEqual(audio.seeks, [120]);
  assert.equal(Math.round(audio.currentTime), 120);
});

test('a track that never reports loaded starts from the top after the wait', async () => {
  const store = memoryStore();
  store.data.set('pbs.player.position:en/psalms/kjv-psa-023.m4a', JSON.stringify({ positionSeconds: 120 }));
  const { audio, player } = setup({ store, autoLoad: false });
  const playing = player.play(track(), FREE);
  await flush();
  mock.timers.tick(LOAD_WAIT_MS);
  await playing;
  assert.deepEqual(audio.seeks, []);
  assert.equal(player.getState().playing, true);
});

test('a track that loads without a status event still resumes at its spot after the wait', async () => {
  const store = memoryStore();
  store.data.set('pbs.player.position:en/psalms/kjv-psa-023.m4a', JSON.stringify({ positionSeconds: 120 }));
  const { audio, player } = setup({ store, autoLoad: false });
  const playing = player.play(track(), FREE);
  await flush();
  audio.loadedSilently();
  mock.timers.tick(LOAD_WAIT_MS);
  await playing;
  assert.deepEqual(audio.seeks, [120]);
});

// ── outside control (lock screen, calls, AirPods) ────────────────────────

test('a pause from outside the app updates the state and keeps her place; an outside play resumes saving', async () => {
  const store = memoryStore();
  const key = 'pbs.player.position:en/psalms/kjv-psa-023.m4a';
  const { audio, player } = setup({ store });
  await player.play(track(), FREE);
  await flush();
  mock.timers.tick(33_000);
  audio.outsidePause();
  await flush();
  assert.equal(player.getState().playing, false);
  assert.equal(JSON.parse(store.data.get(key)!).positionSeconds, 33);
  mock.timers.tick(30_000);
  await flush();
  assert.equal(JSON.parse(store.data.get(key)!).positionSeconds, 33, 'no saving while paused');
  audio.outsidePlay();
  await flush();
  assert.equal(player.getState().playing, true);
  mock.timers.tick(10_000);
  await flush();
  assert.equal(JSON.parse(store.data.get(key)!).positionSeconds, 43);
});

// ── offline (paid) ───────────────────────────────────────────────────────

test('offline is paid only; a paid download then plays from the phone', async () => {
  const { audio, player, files } = setup();
  assert.equal(await player.download(track(), FREE), false);
  assert.equal(player.getState().error, 'offline-locked');
  assert.equal(files.files.size, 0);
  assert.equal(await player.download(track(), PAID), true);
  await player.play(track(), PAID);
  assert.equal(audio.uri, `file:///audio/${'a'.repeat(64)}.m4a`);
});

test('a download whose hash does not match the manifest is thrown away', async () => {
  const files = fakeFiles(() => 'f'.repeat(64));
  const { player, downloads } = setup({ files });
  assert.equal(await player.download(track(), PAID), false);
  assert.equal(player.getState().error, 'download-incomplete');
  assert.equal(downloads.find(track()), null);
  assert.equal(files.files.size, 0);
});

test('an interrupted download leaves nothing behind to be played truncated', async () => {
  const files = fakeFiles(() => new Error('network lost'));
  const { downloads } = setup({ files });
  await assert.rejects(downloads.save(track(), BASE + 'x.m4a'), { code: 'download-incomplete' });
  assert.equal(files.files.size, 0);
  assert.equal(downloads.find(track()), null);
});

// ── screen dim ───────────────────────────────────────────────────────────

function fakeBrightness(level = 0.8) {
  const b = { level, get: async () => b.level, set: async (value: number) => { b.level = value; } };
  return b;
}

test('the screen dims after 15 s without a touch and a touch brings her brightness back', async () => {
  const brightness = fakeBrightness();
  const dimmer = createDimmer(brightness);
  dimmer.setActive(true);
  mock.timers.tick(14_000);
  await dimmer.settled();
  assert.equal(brightness.level, 0.8);
  mock.timers.tick(1_000);
  await dimmer.settled();
  assert.equal(dimmer.dimmed, true);
  assert.ok(brightness.level < 0.1);
  await dimmer.touch();
  assert.equal(dimmer.dimmed, false);
  assert.equal(brightness.level, 0.8);
  mock.timers.tick(15_000);
  await dimmer.settled();
  assert.equal(dimmer.dimmed, true, 'dims again after the next quiet 15 s');
});

test('leaving the screen always restores brightness, and nothing dims when not playing', async () => {
  const brightness = fakeBrightness(0.6);
  const dimmer = createDimmer(brightness);
  dimmer.setActive(true);
  mock.timers.tick(15_000);
  await dimmer.settled();
  await dimmer.release();
  assert.equal(brightness.level, 0.6);
  mock.timers.tick(60_000);
  await dimmer.settled();
  assert.equal(dimmer.dimmed, false);
  assert.equal(brightness.level, 0.6);
});

test('all passed Hush Harbor audio carries both response pauses and they survive a cold resume', async () => {
  const { tracks } = buildLibrary();
  const stories = tracks.filter(hasCallAndResponse);
  assert.ok(stories.length > 0);
  for (const story of stories) assert.ok(story.responsePauses, story.file);
  const story = stories[0];
  const [first] = story.responsePauses!;
  const { player, audio, store } = setup();
  store.data.set(`pbs.player.position:${story.file}`, JSON.stringify({ positionSeconds: first + 2 }));
  try {
    await player.play(story, FREE);
    assert.deepEqual(audio.seekPermissions, [false]);
    assert.deepEqual(audio.seeks, [first]);
    assert.equal(player.getState().response, 0);
    await player.play(tracks.find(track => track.kind === 'psalms')!, FREE);
    assert.deepEqual(audio.seekPermissions, [false, true]);
    assert.equal(player.getState().response, null);
  } finally { await player.dispose(); }
});

test('a passed Imagination Nights row uses the real session script title', () => {
  const ref = 'content/imagination-nights/en/in-01-living-in-the-end.json';
  const script = JSON.parse(readFileSync(`${REPO}/${ref}`, 'utf8'));
  const row = { ...track(), file: 'imagination-nights/en/in-01.m4a', kind: script.kind, ref, status: 'passed' };
  const { tracks, skipped } = buildLibrary(JSON.stringify(row));
  assert.deepEqual(skipped, []);
  assert.equal(trackTitle(tracks[0], 'en'), script.title);
});
