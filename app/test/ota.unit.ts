// Over-the-air fixes (EAS Update): what reaches phones, and what may never go out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import config, { otaKeyStop } from '../app.config';

const ok = { PBS_OTA_UPDATE: '1', REVENUECAT_PBS_IOS_PUBLIC_KEY: 'appl_AbCdEf123456', REVENUECAT_PBS_ANDROID_PUBLIC_KEY: 'goog_AbCdEf123456' };

test('an update stops without both store purchase keys, with a wrong key, or on the test store; passes with both', () => {
  assert.equal(otaKeyStop(ok), null);
  assert.match(otaKeyStop({ ...ok, REVENUECAT_PBS_IOS_PUBLIC_KEY: undefined })!, /^REVENUECAT_PBS_IOS_KEY_MISSING_FOR_OTA/);
  assert.match(otaKeyStop({ ...ok, REVENUECAT_PBS_ANDROID_PUBLIC_KEY: undefined })!, /^REVENUECAT_PBS_ANDROID_KEY_MISSING_FOR_OTA/);
  assert.match(otaKeyStop({ ...ok, REVENUECAT_PBS_IOS_PUBLIC_KEY: 'goog_AbCdEf123456' })!, /^REVENUECAT_PBS_IOS_KEY_MISSING_FOR_OTA/);
  assert.match(otaKeyStop({ ...ok, REVENUECAT_PBS_ANDROID_PUBLIC_KEY: 'appl_AbCdEf123456' })!, /^REVENUECAT_PBS_ANDROID_KEY_MISSING_FOR_OTA/);
  assert.match(otaKeyStop({ ...ok, REVENUECAT_PBS_TEST_STORE: '1' })!, /^REVENUECAT_TEST_STORE_IN_OTA/);
  // Only an update is held to this: a local run or a store build is judged by its own checks.
  assert.equal(otaKeyStop({}), null);
  assert.equal(otaKeyStop({ ...ok, PBS_OTA_UPDATE: undefined, REVENUECAT_PBS_IOS_PUBLIC_KEY: undefined }), null);
});

test('a store build carries the updater on the production channel, and an update only reaches its own app version', () => {
  const projectId = (config.extra as { eas: { projectId: string } }).eas.projectId;
  assert.equal(config.updates?.url, `https://u.expo.dev/${projectId}`);
  assert.equal(config.updates?.checkAutomatically, 'ON_LOAD');
  assert.deepEqual(config.runtimeVersion, { policy: 'appVersion' });
  assert.ok(config.plugins?.some(p => (Array.isArray(p) ? p[0] : p) === 'expo-updates'));
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.ok(pkg.dependencies['expo-updates'], 'expo-updates is a dependency');
  const eas = JSON.parse(readFileSync(new URL('../eas.json', import.meta.url), 'utf8'));
  for (const p of ['production', 'internal']) assert.equal(eas.build[p].channel, 'production', p);
  assert.notEqual(eas.build.preview.channel, 'production');
});

test('the update script sends only landed main code, says what it fixes, and holds the bundle to the key check', () => {
  const s = readFileSync(new URL('../../scripts/ota-update.sh', import.meta.url), 'utf8');
  assert.match(s, /set -euo pipefail/);
  assert.match(s, /OTA_MESSAGE_MISSING/);
  assert.match(s, /OTA_DIRTY_TREE/);
  assert.match(s, /git rev-parse HEAD\)" = "\$\(git rev-parse origin\/main\)/);
  assert.match(s, /^export PBS_OTA_UPDATE=1$/m);
  assert.match(s, /^unset REVENUECAT_PBS_TEST_STORE$/m);
  assert.match(s, /update --channel production /);
  // The key check runs before eas reads the config, so the flag is exported before the update line.
  assert.ok(s.indexOf('export PBS_OTA_UPDATE=1') < s.indexOf('update --channel production'));
});
