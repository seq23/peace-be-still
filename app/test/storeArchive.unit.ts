// A clean store build gets every file the app bundle needs. `eas build --local` copies the repo by eas-cli's own
// ignore rules (scripts/store-archive.mjs), not by git's: on 27 Nov 2026 night-bed.mp3 was in git and both 1.0.1
// store builds still failed with "Unable to resolve module ../../assets/audio/night-bed.mp3".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { BUILT_IN_THE_BUILD, EAS_CLI_RULES_FOR, easCopyDrops, isFile, requiredAssets } from '../scripts/store-archive.mjs';

const APP = resolve(__dirname, '..');
const ROOT = resolve(APP, '..');
const tracked = new Set(execFileSync('git', ['ls-files', '-z'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean));

test('the copy rules are eas-cli\'s own: a parent *.mp3 beats a child folder\'s exception; a root exception works', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pbs-eas-copy-'));
  mkdirSync(join(dir, 'app/assets/audio'), { recursive: true });
  writeFileSync(join(dir, '.gitignore'), '*.mp3\n');
  writeFileSync(join(dir, 'app/assets/audio/.gitignore'), '!night-bed.mp3\n');
  assert.equal(easCopyDrops(dir)('app/assets/audio/night-bed.mp3'), true, 'the 27 Nov failure: git keeps it, eas-cli drops it');
  writeFileSync(join(dir, '.gitignore'), '*.mp3\n!app/assets/audio/night-bed.mp3\n');
  writeFileSync(join(dir, 'app/assets/audio/.gitignore'), '');
  assert.equal(easCopyDrops(dir)('app/assets/audio/night-bed.mp3'), false);
  // A dropped folder drops what is in it, and .easignore (when there is one) is the only list read.
  writeFileSync(join(dir, '.gitignore'), 'assets\n');
  assert.equal(easCopyDrops(dir)('app/assets/audio/night-bed.mp3'), true);
  writeFileSync(join(dir, '.easignore'), 'nothing-here\n');
  assert.equal(easCopyDrops(dir)('app/assets/audio/night-bed.mp3'), false);
  assert.equal(easCopyDrops(dir)('node_modules/x/index.js'), true);
});

test('the rules are written for the eas-cli both store workflows run', () => {
  for (const wf of ['ios-store-build.yml', 'android-store-build.yml'])
    assert.ok(readFileSync(join(ROOT, '.github/workflows', wf), 'utf8').split('\n').some((line) => line.trim() === `EAS_CLI: ${EAS_CLI_RULES_FOR}`), wf);
  const pkg = JSON.parse(readFileSync(join(APP, 'package.json'), 'utf8'));
  assert.equal(pkg.devDependencies.ignore, '5.3.0', 'eas-cli 27.11.0 pins ignore 5.3.0');
});

test('every file the app bundle needs reaches a clean store build', () => {
  const needed = requiredAssets(APP);
  // Rule zero: a scan that finds nothing proves nothing. These are known requires today.
  for (const known of ['app/assets/audio/night-bed.mp3', 'app/assets/icon.png', 'app/assets/adaptive-icon.png', 'app/src/bible/data/kjv.db', 'app/src/bible/data/cuvt.db', 'app/src/i18n/ko.json'])
    assert.ok(needed.includes(known), `scan missed ${known}`);
  assert.ok(needed.length >= 20, `only ${needed.length} required files found`);

  const drops = easCopyDrops(ROOT);
  const missing = needed.filter((rel) => !BUILT_IN_THE_BUILD.includes(rel)).filter((rel) => !isFile(ROOT, rel) || !tracked.has(rel) || drops(rel));
  assert.deepEqual(missing, [], 'not in git, or left out of the eas-cli copy: the store build cannot resolve these');
});

test('the files the build writes itself are written by its post-install step', () => {
  const pkg = JSON.parse(readFileSync(join(APP, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['eas-build-post-install'], 'npm run -s library');
  assert.equal(pkg.scripts.library, 'tsx src/player/build-library.ts && tsx src/content/build.ts');
  for (const rel of BUILT_IN_THE_BUILD) assert.ok(requiredAssets(APP).includes(rel), `${rel} is no longer required: take it off BUILT_IN_THE_BUILD`);
});

test('the night bed is real audio, not a stub that plays silence', () => {
  const bed = readFileSync(join(ROOT, 'app/assets/audio/night-bed.mp3'));
  assert.ok(bed.length > 200_000, `night-bed.mp3 is only ${bed.length} bytes`);
  const id3 = bed.subarray(0, 3).toString('latin1') === 'ID3';
  const frame = bed[0] === 0xff && (bed[1] & 0xe0) === 0xe0;
  assert.ok(id3 || frame, 'night-bed.mp3 does not start like an MP3');
  // Silence compresses to near-constant frames: a real bed has varied bytes across the file.
  const sample = bed.subarray(bed.length >> 2, (bed.length >> 2) + 4096);
  assert.ok(new Set(sample).size > 200, 'night-bed.mp3 looks like silence');
});
