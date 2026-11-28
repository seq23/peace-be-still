// The Android store build hung from 24 Nov 2026: Gradle 9.4's daemon ran out of the template's 512 MiB Metaspace
// ("OutOfMemoryError: Metaspace", run 46117530483) and sat there until the 75-minute timeout. plugins/gradle-memory.js
// raises it; this proves the real config chain (`expo config --type introspect`) writes it, and that the template's
// own jvmargs line is replaced, not left beside it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const APP = resolve(__dirname, '..');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { setJvmArgs, JVM_ARGS } = require('../plugins/gradle-memory.js');
type Prop = { type: string; key?: string; value?: string };

const mib = (args: string, flag: string) => {
  const m = new RegExp(`${flag}(\\d+)([mg])`, 'i').exec(args);
  return m ? Number(m[1]) * (m[2].toLowerCase() === 'g' ? 1024 : 1) : 0;
};

test('the app config gives Gradle at least 1 GiB of Metaspace and 4 GiB of heap, through the real plugin chain', () => {
  const out = execFileSync('npx', ['expo', 'config', '--type', 'introspect', '--json'], { cwd: APP, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  const props = JSON.parse(out)._internal.modResults.android.gradleProperties as Prop[];
  const jvm = props.filter(p => p.key === 'org.gradle.jvmargs');
  assert.equal(jvm.length, 1, 'one jvmargs line');
  assert.ok(mib(jvm[0].value ?? '', '-XX:MaxMetaspaceSize=') >= 1024, `Metaspace: ${jvm[0].value}`);
  assert.ok(mib(jvm[0].value ?? '', '-Xmx') >= 4096, `heap: ${jvm[0].value}`);
});

test('the template\'s 512 MiB line is replaced, never kept beside ours', () => {
  const template: Prop[] = [
    { type: 'comment', value: 'Specifies the JVM arguments used for the daemon process.' },
    { type: 'property', key: 'org.gradle.jvmargs', value: '-Xmx2048m -XX:MaxMetaspaceSize=512m' },
    { type: 'property', key: 'android.useAndroidX', value: 'true' },
  ];
  const out = setJvmArgs(template) as Prop[];
  assert.deepEqual(out.filter(p => p.key === 'org.gradle.jvmargs').map(p => p.value), [JVM_ARGS]);
  assert.equal(out.find(p => p.key === 'android.useAndroidX')?.value, 'true', 'other properties are kept');
  assert.equal(out.length, 3);
});
