// How the encryption breaks, each proven on a fresh clone of this commit (CI: ci.yml `encrypted`):
// a missing key is a named stop (never empty prompts), a plain-text commit or copy fails the check,
// and the real key decrypts the real prompts.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { check, HEADER } from '../check-encrypted.mjs';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const env = { ...process.env };
const KEY = env.PBS_GIT_CRYPT_KEY;
delete env.PBS_GIT_CRYPT_KEY;

/** A clone with no key and no filter: what anyone reading the public repo gets. */
function lockedClone() {
  const dir = mkdtempSync(join(tmpdir(), 'pbs-crypt-'));
  execFileSync('git', ['clone', '-q', '--no-local', root, dir], { env });
  return dir;
}
const unlock = (dir, extra = {}) => spawnSync('bash', ['scripts/git-crypt-unlock.sh'], { cwd: dir, env: { ...env, ...extra }, encoding: 'utf8' });

test('a clone without the key holds only ciphertext, and the check stops instead of passing', () => {
  const dir = lockedClone();
  assert.ok(readFileSync(join(dir, 'worker/src/prompts.ts')).subarray(0, HEADER.length).equals(HEADER));
  const r = check(dir);
  assert.equal(r.code, 3);
  assert.match(r.lines.join('\n'), /NAMED STOP GIT_CRYPT_LOCKED/);
});

test('a missing key is NAMED STOP PBS_GIT_CRYPT_KEY_MISSING (exit 3), files left encrypted', () => {
  const dir = lockedClone();
  const r = unlock(dir);
  assert.equal(r.status, 3, r.stdout + r.stderr);
  assert.match(r.stdout, /NAMED STOP PBS_GIT_CRYPT_KEY_MISSING/);
  assert.ok(readFileSync(join(dir, 'worker/src/crisis.ts')).subarray(0, HEADER.length).equals(HEADER));
});

test('a wrong key value is NAMED STOP PBS_GIT_CRYPT_KEY_INVALID', () => {
  const r = unlock(lockedClone(), { PBS_GIT_CRYPT_KEY: Buffer.from('not a key').toString('base64') });
  assert.equal(r.status, 3);
  assert.match(r.stdout, /NAMED STOP PBS_GIT_CRYPT_KEY_INVALID/);
});

test('plain text committed at a protected path fails PLAIN_TEXT_COMMITTED', () => {
  const dir = lockedClone(); // no filter configured: git stores what it is given
  writeFileSync(join(dir, 'worker/src/prompts.ts'), 'export const plain = "You help someone talk things through from a Christian faith";\n');
  execFileSync('git', ['add', 'worker/src/prompts.ts'], { cwd: dir });
  const committed = check(dir).lines.join('\n');
  assert.match(committed, /PLAIN_TEXT_COMMITTED worker\/src\/prompts\.ts/);
});

test('with the real key: prompts decrypt, the check passes, and a plain-text copy anywhere fails COPY', { skip: KEY ? false : 'PBS_GIT_CRYPT_KEY not in this environment (CI has it)' }, () => {
  const dir = lockedClone();
  const r = unlock(dir, { PBS_GIT_CRYPT_KEY: KEY });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const prompts = readFileSync(join(dir, 'worker/src/prompts.ts'), 'utf8');
  assert.match(prompts, /export type PromptId/);
  assert.equal(check(dir).code, 0, check(dir).lines.join('\n'));
  // A prompt line pasted into a doc, and a red-team question pasted into an unencrypted script.
  const promptLine = prompts.split('\n').find((l) => l.startsWith('- tell anyone they are saved'));
  assert.ok(promptLine);
  const fixture = JSON.parse(readFileSync(join(dir, 'worker/test/fixtures/redteam.json'), 'utf8'));
  const question = (Array.isArray(fixture) ? fixture : fixture.cases ?? Object.values(fixture).flat()).map((c) => c?.prompt ?? c?.text).find((s) => typeof s === 'string' && s.length > 30);
  assert.ok(question);
  writeFileSync(join(dir, 'docs/copied.md'), `${promptLine}\n`);
  writeFileSync(join(dir, 'worker/scripts/copied.mjs'), `export const q = ${JSON.stringify(question)};\n`);
  execFileSync('git', ['add', 'docs/copied.md', 'worker/scripts/copied.mjs'], { cwd: dir });
  const out = check(dir);
  assert.equal(out.code, 1);
  assert.match(out.lines.join('\n'), /COPY docs\/copied\.md: holds text from worker\/src\/prompts\.ts/);
  assert.match(out.lines.join('\n'), /COPY worker\/scripts\/copied\.mjs: holds text from worker\/test\/fixtures\/redteam\.json/);
  assert.ok(!out.lines.join('\n').includes(promptLine.slice(2, 40)), 'findings never print the protected text');
});
