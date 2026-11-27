// The PR app check leaves out only files that are really git-crypt ciphertext, never a plain file, and the
// script refuses to delete anything outside CI.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { lockedFiles } from '../leave-out-locked.mjs';

const script = new URL('../leave-out-locked.mjs', import.meta.url).pathname;
function tree(lockedCount) {
  const dir = mkdtempSync(join(tmpdir(), 'locked-'));
  mkdirSync(join(dir, 'test')); mkdirSync(join(dir, 'node_modules'));
  writeFileSync(join(dir, 'test', 'plain.render.tsx'), "import x from 'y';\n");
  writeFileSync(join(dir, 'test', 'GITCRYPT-in-text.ts'), '// mentions \\0GITCRYPT\\0 in text, not at the start\n');
  for (let i = 0; i < lockedCount; i++) writeFileSync(join(dir, 'test', `locked${i}.render.tsx`), Buffer.concat([Buffer.from('\0GITCRYPT\0'), Buffer.from([1, 2, 3])]));
  writeFileSync(join(dir, 'node_modules', 'dep.js'), Buffer.from('\0GITCRYPT\0'));
  return dir;
}

test('only files that start with the git-crypt header are locked (node_modules never read)', () => {
  const dir = tree(1);
  assert.deepEqual(lockedFiles(dir).map(f => f.slice(dir.length + 1)), ['test/locked0.render.tsx']);
});
test('in CI it removes the locked file, keeps every plain one, and names what it left out', () => {
  const dir = tree(1);
  const r = spawnSync(process.execPath, [script], { cwd: dir, env: { ...process.env, CI: 'true' }, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /LEFT OUT \(encrypted; main runs it\): test\/locked0\.render\.tsx/);
  assert.ok(!existsSync(join(dir, 'test', 'locked0.render.tsx')));
  assert.ok(existsSync(join(dir, 'test', 'plain.render.tsx')) && existsSync(join(dir, 'test', 'GITCRYPT-in-text.ts')));
});
test('more than 3 locked files fails, so the PR check never quietly proves nothing', () => {
  const r = spawnSync(process.execPath, [script], { cwd: tree(4), env: { ...process.env, CI: 'true' }, encoding: 'utf8' });
  assert.equal(r.status, 1);
});
test('outside CI it deletes nothing', () => {
  const dir = tree(1);
  const env = { ...process.env }; delete env.CI;
  const r = spawnSync(process.execPath, [script], { cwd: dir, env, encoding: 'utf8' });
  assert.equal(r.status, 2);
  assert.ok(existsSync(join(dir, 'test', 'locked0.render.tsx')));
});
