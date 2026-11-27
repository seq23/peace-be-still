// ship-ready app-review.md check 13: nothing shipped may sell a feature the app does not have. "Record in your own
// voice" was cut from v1 on 21 Nov 2026 and is built by Write your own night (27 Nov 2026) on iPhone only: Android
// keeps RECORD_AUDIO blocked, so nothing Google Play or the website shows may promise it, the App Store text and the
// legal pages may, and the promise is only allowed while the recorder really exists.
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

test('recording in your own voice is promised only where it is built: never on Google Play or the website', () => {
  // The website's own legal pages are the privacy policy (built from legal/*.md, which may describe it); every other page sells.
  const legalPages = new Set(['../site/public/privacy.html', '../site/public/es/privacidad.html']);
  const files = [...walk('../store/google-play'), ...walk('../site/content'), ...walk('../site/public')].filter(file => /\.(json|md|mjs|html|txt)$/.test(file) && !legalPages.has(file) && !file.endsWith('site/content/legal.mjs'));
  assert.ok(files.length > 20, `only ${files.length} files read`);
  const hits = files.flatMap(file => readFileSync(file, 'utf8').split('\n').filter(promisesVoiceRecording).map(line => `${file}: ${line.trim().slice(0, 120)}`));
  assert.deepEqual(hits, []);
  assert.ok(!(PAID_FEATURES as readonly string[]).some(feature => /voice|record/i.test(feature)), 'recording is part of ownNight, not a gate row of its own');
});

test('where recording is promised (App Store text, legal pages, app strings), the recorder is built: iPhone only, the microphone question in English and Spanish, Android still blocked', () => {
  const promised = [...walk('../store').filter(f => !f.includes('google-play')), ...walk('../legal'), 'src/i18n/en.json', 'src/i18n/es.json']
    .filter(file => /\.(json|md)$/.test(file) && readFileSync(file, 'utf8').split('\n').some(promisesVoiceRecording));
  // The privacy policy describes recordings in both languages (27 Nov 2026), so the promise exists and is checked.
  assert.ok(promised.includes('../legal/privacy.md') && promised.includes('../legal/es/privacidad.md'), `promised in: ${promised.join(', ')}`);
  const config = readFileSync('app.config.ts', 'utf8');
  assert.match(config, /microphonePermission: MICROPHONE\.en/);
  assert.match(config, /locales: \{ es: '\.\/locales\/es\.json' \}/);
  assert.match(JSON.parse(readFileSync('locales/es.json', 'utf8')).ios.NSMicrophoneUsageDescription, /micrófono.*nunca se sube/);
  assert.match(config, /'android\.permission\.RECORD_AUDIO'/);
  assert.match(config, /recordAudioAndroid: false/);
  assert.match(readFileSync('src/ownNight/adapters.ts', 'utf8'), /export const canRecord = \(\) => Platform\.OS === 'ios';/);
  assert.match(readFileSync('src/ownNight/Recorder.tsx', 'utf8'), /useAudioRecorder\(RecordingPresets\.HIGH_QUALITY\)/);
});

// The journey picker shows a journey's purpose line to every age band it is offered to, teens
// included, and on phones where a paid feature is hidden. So a line seen by more than adults never
// sells a paid feature (#151 review, 27 Nov 2026: "With a paid plan, fall asleep to it" reached teens).
test('journey purpose lines shown beyond adults never promise a paid feature', async () => {
  const { journeys } = await import('../src/model');
  const sells = /paid|premium|subscri|plan de pago|de pago|suscrip/i;
  for (const lang of ['en', 'es'] as const) {
    const strings = JSON.parse(readFileSync(new URL(`../src/i18n/${lang}.json`, import.meta.url), 'utf8'));
    for (const j of journeys.filter(x => !x.ages || x.ages.some(a => a !== 'adult'))) {
      assert.doesNotMatch(String(strings[j.purpose] ?? ''), sells, `${lang} ${j.id}: ${strings[j.purpose]}`);
    }
  }
});
