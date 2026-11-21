// ship-ready app-review.md check 13: nothing shipped may sell a feature v1 does not have. "Record in your own
// voice" was cut from v1 on 21 Nov 2026 (it ships in v1.1), so no app string, store text, legal page or site page
// may promise it, in English or Spanish.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PAID_FEATURES } from '../src/gates';

const VOICE_RECORDING = [
  /\brecord\w*\b[^.\n]{0,40}\b(?:own|your)\s+voice/i,
  /\b(?:own|your)\s+voice\b[^.\n]{0,40}\brecord/i,
  /\bgrab\w*\b[^.\n]{0,40}\b(?:tu|su)\s+(?:propia\s+)?voz/i,
  /\b(?:tu|su)\s+propia\s+voz\b/i,
];
export const promisesVoiceRecording = (text: string) => VOICE_RECORDING.some(pattern => pattern.test(text));

const walk = (dir: string): string[] => !existsSync(dir) ? [] : readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? (name === 'node_modules' ? [] : walk(path)) : [path];
});
const shipped = () => [
  'src/i18n/en.json', 'src/i18n/es.json',
  ...walk('../store'), ...walk('../legal'), ...walk('../site/content'), ...walk('../site/public'),
].filter(file => /\.(json|md|mjs|html|txt)$/.test(file));

test('the check catches the old promise in both languages and passes ordinary uses of "voice"', () => {
  assert.ok(promisesVoiceRecording('declaration topics, offline listening and recording in your own voice.'));
  assert.ok(promisesVoiceRecording('anything you record in your own voice stay on your phone'));
  assert.ok(promisesVoiceRecording('escuchar sin conexión y grabar con tu propia voz.'));
  assert.ok(!promisesVoiceRecording('Hearing your own voice say a verse helps it stay with you.'));
  assert.ok(!promisesVoiceRecording('toda la Biblia para leer y para escuchar en voz alta'));
  assert.ok(!promisesVoiceRecording('Talk it through in a Black church voice'));
});

test('no shipped string promises recording in your own voice, and no gate row exists for it', () => {
  const files = shipped();
  assert.ok(files.length > 20, `only ${files.length} files read`);
  const hits = files.flatMap(file => readFileSync(file, 'utf8').split('\n').filter(promisesVoiceRecording).map(line => `${file}: ${line.trim().slice(0, 120)}`));
  assert.deepEqual(hits, []);
  assert.ok(!(PAID_FEATURES as readonly string[]).some(feature => /voice|record/i.test(feature)));
});
