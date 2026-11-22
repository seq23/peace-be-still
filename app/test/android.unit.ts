// The Google Play build: the release gate on RevenueCat's Play key, the internal draft upload profile, the
// bundle check and the proof that the upload landed as a draft on the internal track only.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import config, { androidStoreKeyStop } from '../app.config';
import products from '../src/config/products.json';
import { FORBIDDEN, manifestIssues } from '../scripts/android/check-aab.mjs';
import { trackIssues } from '../scripts/android/play-track.mjs';

const KEY = 'goog_AbCdEfGh12345678';
const build = (over: Record<string, string | undefined>) => ({ EAS_BUILD_PLATFORM: 'android', EAS_BUILD_PROFILE: 'internal', REVENUECAT_PBS_ANDROID_PUBLIC_KEY: KEY, ...over });

test('a Play store build stops without RevenueCat\'s Play key, with a wrong key, or on the test store; passes with a goog_ key', () => {
  for (const profile of ['internal', 'production']) {
    assert.equal(androidStoreKeyStop(build({ EAS_BUILD_PROFILE: profile })), null, profile);
    assert.match(androidStoreKeyStop(build({ EAS_BUILD_PROFILE: profile, REVENUECAT_PBS_ANDROID_PUBLIC_KEY: undefined }))!, /^REVENUECAT_PBS_ANDROID_KEY_MISSING/);
    for (const wrong of ['', 'appl_AbCdEfGh12345678', 'test_AbCdEfGh12345678', 'goog_', 'sk_AbCdEfGh12345678'])
      assert.match(androidStoreKeyStop(build({ EAS_BUILD_PROFILE: profile, REVENUECAT_PBS_ANDROID_PUBLIC_KEY: wrong }))!, /^REVENUECAT_PBS_ANDROID_KEY_MISSING/, wrong);
    assert.match(androidStoreKeyStop(build({ EAS_BUILD_PROFILE: profile, REVENUECAT_PBS_TEST_STORE: '1' }))!, /^REVENUECAT_TEST_STORE_IN_PLAY_BUILD/);
  }
  // Not a Play store build: iOS, a dev build, the web preview, the tests.
  assert.equal(androidStoreKeyStop(build({ EAS_BUILD_PLATFORM: 'ios', REVENUECAT_PBS_ANDROID_PUBLIC_KEY: undefined })), null);
  assert.equal(androidStoreKeyStop(build({ EAS_BUILD_PROFILE: 'development', REVENUECAT_PBS_ANDROID_PUBLIC_KEY: undefined })), null);
  assert.equal(androidStoreKeyStop({}), null);
});

test('the internal profile builds an App Bundle and submits it to the internal track as a draft only', () => {
  const eas = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));
  assert.equal(eas.build.internal.extends, 'production');
  assert.equal(eas.build.internal.distribution, 'store');
  assert.equal(eas.build.internal.android.buildType, 'app-bundle');
  assert.deepEqual(eas.submit.internal.android, { serviceAccountKeyPath: './play-sa.json', track: 'internal', releaseStatus: 'draft' });
  assert.equal(eas.submit.production.android, undefined, 'nothing submits to a Play production track from this repo yet');
  const ignored = readFileSync(new URL('../../.gitignore', import.meta.url), 'utf8').split('\n');
  for (const name of ['play-sa.json', '*.aab']) assert.ok(ignored.includes(name), `${name} is git-ignored`);
});

test('the workflow is manual only, one at a time, time-boxed, never uploads the bundle, and always deletes the key file', () => {
  const yml = readFileSync(new URL('../../.github/workflows/android-store-build.yml', import.meta.url), 'utf8');
  assert.match(yml, /^on:\n  workflow_dispatch:\n\n/m);
  assert.doesNotMatch(yml, /^\s+(?:push|pull_request|schedule):/m);
  assert.match(yml, /^concurrency:\n  #[^\n]*\n  group: android-store-build\n  cancel-in-progress: false/m);
  assert.match(yml, /timeout-minutes: \d+/);
  assert.doesNotMatch(yml, /upload-artifact|actions\/cache/);
  assert.match(yml, /if: always\(\)\n\s+run: rm -f play-sa\.json/);
  assert.match(yml, /--profile internal --local --non-interactive/);
  assert.match(yml, /play-track\.mjs play-sa\.json com\.peacebestillapp\.mobile/);
});

test('the Android app blocks every permission it does not use, and the bundle check fails if one comes back', () => {
  const blocked = config.android?.blockedPermissions ?? [];
  for (const p of ['android.permission.RECORD_AUDIO', 'com.google.android.gms.permission.AD_ID', 'android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE', 'android.permission.SYSTEM_ALERT_WINDOW'])
    assert.ok(blocked.includes(p) && FORBIDDEN.includes(p), p);
  const audio = config.plugins?.find(p => Array.isArray(p) && p[0] === 'expo-audio') as [string, { recordAudioAndroid?: boolean }];
  assert.equal(audio[1].recordAudioAndroid, false);
  assert.equal(config.android?.package, 'com.peacebestillapp.mobile');
  const good = '<manifest package="com.peacebestillapp.mobile" android:versionCode="7"><uses-permission android:name="android.permission.INTERNET"/><uses-permission android:name="com.android.vending.BILLING"/></manifest>';
  assert.deepEqual(manifestIssues(good).issues, []);
  assert.equal(manifestIssues(good).versionCode, '7');
  assert.deepEqual(manifestIssues(good.replace('INTERNET', 'RECORD_AUDIO')).issues, ['AAB_FORBIDDEN_PERMISSION: android.permission.RECORD_AUDIO']);
  assert.match(manifestIssues(good.replace('com.peacebestillapp.mobile', 'com.example')).issues[0], /^AAB_WRONG_PACKAGE/);
  assert.match(manifestIssues(good.replace(/<uses-permission android:name="com.android.vending.BILLING"\/>/, '')).issues[0], /^AAB_NO_BILLING/);
  assert.match(manifestIssues(good.replace(' android:versionCode="7"', '')).issues[0], /^AAB_NO_VERSION_CODE/);
});

test('the upload is proven only by a draft on the internal track, and fails red on anything else', () => {
  assert.deepEqual(trackIssues([{ track: 'internal', releases: [{ status: 'draft', versionCodes: ['12'] }] }], 12), []);
  assert.match(trackIssues([], 12)[0], /^PLAY_TRACK_MISSING/);
  assert.match(trackIssues([{ track: 'internal', releases: [{ status: 'draft', versionCodes: ['11'] }] }], 12)[0], /^PLAY_TRACK_MISSING/);
  assert.ok(trackIssues([{ track: 'internal', releases: [{ status: 'completed', versionCodes: ['12'] }] }], 12).some(i => /^PLAY_TRACK_WRONG: versionCode 12 is completed on internal/.test(i)));
  assert.ok(trackIssues([{ track: 'internal', releases: [{ status: 'draft', versionCodes: ['12'] }] }, { track: 'production', releases: [{ status: 'draft', versionCodes: ['12'] }] }], 12)
    .some(i => /on production/.test(i)));
});

test('Play uses the App Store subscription ids, each with one base plan, at the App Store prices', () => {
  assert.deepEqual(Object.values(products.products).map(p => [p.id, p.playBasePlan, p.usPrice]), [
    ['com.peacebestillapp.mobile.paid.monthly', 'monthly', '7.99'],
    ['com.peacebestillapp.mobile.paid.yearly', 'yearly', '39.99'],
  ]);
  // Play's rules: product ids lowercase letters, digits, _ and .; base plan ids lowercase letters, digits and -.
  for (const p of Object.values(products.products)) {
    assert.match(p.id, /^[a-z0-9][a-z0-9_.]{0,138}$/);
    assert.match(p.playBasePlan, /^[a-z0-9][a-z0-9-]{0,62}$/);
  }
});
