// The App Store build workflow: what it may do with the signing and App Store Connect keys, and what it never does.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const yml = readFileSync(new URL('../../.github/workflows/ios-store-build.yml', import.meta.url), 'utf8');
const steps = yml.split(/\n      - /).slice(1);
const name = (st: string) => st.match(/name: (.+)/)?.[1] ?? st.split('\n')[0];
const using = (secret: string) => steps.filter(st => st.includes(`secrets.${secret}`)).map(name);

test('the iOS workflow is manual only, one at a time, time-boxed, never uploads the .ipa, and always deletes the key file', () => {
  assert.match(yml, /^on:\n  workflow_dispatch:\n\n/m);
  assert.doesNotMatch(yml, /^\s+(?:push|pull_request|schedule):/m);
  assert.match(yml, /^concurrency:\n  #[^\n]*\n  group: ios-store-build\n  cancel-in-progress: false/m);
  assert.match(yml, /timeout-minutes: \d+/);
  assert.doesNotMatch(yml, /upload-artifact|actions\/cache@/);
  assert.match(yml, /if: always\(\)\n\s+working-directory: \.\n\s+run: rm -rf app\/asc-key\.p8 /);
  const jobEnv = yml.split(/\n    steps:\n/)[0].split(/\n    env:\n/)[1] ?? '';
  assert.doesNotMatch(jobEnv, /secrets\./);
});

test('each secret reaches only the steps that need it, and the App Store Connect key only after the build and check', () => {
  assert.deepEqual(using('EXPO_TOKEN'), ['Secrets present', 'Build the .ipa (eas build --local)', 'Upload to App Store Connect (eas submit; TestFlight only, no review)']);
  assert.deepEqual(using('ASC_API_KEY_P8'), ['Secrets present', 'App Store Connect key file']);
  assert.deepEqual(using('REVENUECAT_PBS_IOS_PUBLIC_KEY'), ['Secrets present', 'Release gate (RevenueCat App Store key, updater channel)', 'Build the .ipa (eas build --local)']);
  const order = steps.map(name);
  assert.equal(order.indexOf('App Store Connect key file'), order.indexOf('Upload to App Store Connect (eas submit; TestFlight only, no review)') - 1);
  assert.ok(order.indexOf('App Store Connect key file') > order.indexOf('Check the .ipa (bundle id, version, signed for the App Store)'));
  assert.ok(order.indexOf('Release gate (RevenueCat App Store key, updater channel)') < order.indexOf('Build the .ipa (eas build --local)'));
});

test('the iOS workflow uploads to TestFlight only: it never creates a store version or asks for App Review', () => {
  assert.match(yml, /--profile production --local --non-interactive/);
  assert.match(yml, /submit --platform ios --profile production --path /);
  assert.doesNotMatch(yml, /appStoreVersionSubmissions|reviewSubmissions|appStoreVersions|--auto-submit|submit-for-review/i);
  assert.match(yml, /NAMED STOP REVENUECAT_PBS_IOS_KEY_MISSING/);
  assert.match(yml, /NAMED STOP IPA_VERSION/);
});
