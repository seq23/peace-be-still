#!/usr/bin/env node
// A pull request's checkout has no git-crypt key (it goes to reviewed main only, #140), so encrypted files are
// ciphertext there. The PR app check runs this in app/: it names each locked file and removes it from that
// throwaway checkout only, so the typecheck and tests run on everything readable. It refuses to run anywhere a
// file is plain (an unlocked clone), and fails when more than MAX files are locked, so the PR check can never
// quietly prove nothing.
import { closeSync, openSync, readdirSync, readSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const MAX = 3;
const MAGIC = Buffer.from('\0GITCRYPT\0');
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.name === 'node_modules' || e.name === '.git' ? [] : e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
const isLocked = file => { const b = Buffer.alloc(MAGIC.length); const fd = openSync(file, 'r'); try { readSync(fd, b, 0, b.length, 0); } finally { closeSync(fd); } return b.equals(MAGIC); };

export function lockedFiles(dir = '.') { return walk(dir).filter(isLocked); }

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!process.env.CI) { console.error('leave-out-locked: CI only (it deletes files from the checkout)'); process.exit(2); }
  const locked = lockedFiles('.');
  for (const f of locked) { console.log(`LEFT OUT (encrypted; main runs it): ${f}`); rmSync(f); }
  if (locked.length > MAX) { console.error(`${locked.length} locked files (more than ${MAX}): the PR check would prove too little`); process.exit(1); }
  console.log(`${locked.length} locked file(s) left out`);
}
