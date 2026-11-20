import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { create, act } from 'react-test-renderer';
import { createPlayer, readManifest } from './player.js';
import { createPlayerScreen } from './PlayerScreen.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const manifest = await readFile(new URL('../../../audio/manifest.jsonl', import.meta.url), 'utf8');
const tracks = readManifest(manifest, 'https://audio.example.com/library/');
function setup() {
 let time = 0, callback, playing = false, uri = null;
 const player = createPlayer({ audio: { load: async value => { uri = value; }, play: async () => { playing = true; }, pause: () => { playing = false; }, dispose() {} }, downloads: { find: async () => 'file:///offline', save: async () => 'file:///offline' }, clock: { setTimeout: fn => { callback = fn; return 1; }, clearTimeout() {} }, now: () => time });
 return { player, tick: ms => { time += ms; }, expire: () => callback(), playing: () => playing, uri: () => uri };
}
test('manifest drives playback, excludes failed rows and rejects unsafe paths', async () => {
 assert.ok(tracks.length > 0); const s = setup(); await s.player.play(tracks[0], { paid: false });
 assert.equal(s.uri(), tracks[0].url); assert.equal(s.player.state().track.ref, tracks[0].ref);
 assert.deepEqual(readManifest('{"status":"FAILED"}', 'https://audio.example.com/'), []);
 assert.throws(() => readManifest(JSON.stringify({ ...tracks[0], file: '../bad.m4a' }), 'https://audio.example.com/'));
});
test('sleep timer expires and resume uses the same track', async () => {
 const s = setup(); await s.player.play(tracks[0], {}); s.player.setSleepTimer(15); s.tick(900000); s.player.foreground();
 assert.equal(s.playing(), false); assert.equal(s.player.state().deadline, null);
 await s.player.resume(); assert.equal(s.playing(), true); assert.equal(s.player.state().track.ref, tracks[0].ref);
 s.player.setSleepTimer(30); s.expire(); assert.equal(s.playing(), false);
 s.player.setSleepTimer(45); s.player.setSleepTimer(null); assert.equal(s.player.state().deadline, null);
 assert.throws(() => s.player.setSleepTimer(5));
});
test('offline is paid only', async () => {
 const s = setup(); await assert.rejects(s.player.download(tracks[0], {}));
 assert.equal(await s.player.download(tracks[0], { paid: true }), 'file:///offline');
 await s.player.play(tracks[0], { paid: true }); assert.equal(s.uri(), 'file:///offline');
});
test('screen renders and updates playback, dimming, timer and access states', async () => {
 const s = setup(); const Screen = createPlayerScreen(React, { View: 'View', Text: 'Text', Pressable: 'Pressable' });
 let tree; await act(async () => { tree = create(React.createElement(Screen, { player: s.player, tracks: [tracks[0]], user: {} })); });
 const text = () => JSON.stringify(tree.toJSON());
 const press = async label => act(async () => { await tree.root.findByProps({ accessibilityLabel: label }).props.onPress(); });
 assert.match(text(), /Choose a track/); assert.match(text(), /Voice made with AI/);
 await press(tracks[0].ref); assert.match(text(), /Pause/);
 await press('15 minutes'); assert.match(text(), /Sleep timer on/);
 await press('Dim screen'); assert.match(text(), /Brighten screen/);
 await press('Download for offline'); assert.match(text(), /Offline download unavailable/);
 await press('Pause'); assert.match(text(), /Resume/);
 await act(async () => tree.unmount());
});
