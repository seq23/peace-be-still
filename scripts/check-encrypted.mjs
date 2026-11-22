#!/usr/bin/env node
// The chat prompts, test question sets and crisis lists are committed ONLY encrypted (git-crypt; the
// paths are the `filter=git-crypt` lines in .gitattributes, the one list). This check fails on:
//  PLAIN_TEXT_COMMITTED  a protected path whose staged/committed blob is not git-crypt ciphertext
//                        (committed from a clone that never ran scripts/git-crypt-unlock.sh);
//  NOT_PROTECTED         a file that must be protected is missing from .gitattributes or from git;
//  COPY                  text from a protected file sitting in plain text in any other tracked file.
// The copy scan needs the plain text, so a locked tree is NAMED STOP GIT_CRYPT_LOCKED (exit 3), never a pass.
// Logs are public on this repo: findings name files and line numbers, never the protected text.
//   node scripts/check-encrypted.mjs            the full check (CI: ci.yml `encrypted`)
//   node scripts/check-encrypted.mjs --locked   prints the protected files still locked here, NUL-separated
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const HEADER = Buffer.from('\0GITCRYPT\0');
/** The floor: these must be protected, whatever .gitattributes says (Rule 0: never a pass on an empty list). */
export const MUST = ['worker/src/prompts.ts', 'worker/src/crisis.ts', 'worker/src/voice/samples.ts', 'worker/test/fixtures/redteam.json', 'worker/test/fixtures/crisis-phrases.json', 'worker/test/crisis.test.ts'];
const MIN_FRAGMENTS = 200; // the real files hold ~900; far fewer means the extractor broke

const git = (cwd, args, input) => execFileSync('git', args, { cwd, input, maxBuffer: 1 << 28 });
const isLocked = (buf) => buf.subarray(0, HEADER.length).equals(HEADER);

export function protectedPaths(cwd) {
  const files = git(cwd, ['ls-files', '-z']).toString().split('\0').filter(Boolean);
  if (!files.length) return { files, prot: [] };
  const out = git(cwd, ['check-attr', '-z', '--stdin', 'filter'], files.join('\0')).toString().split('\0');
  const prot = [];
  for (let i = 0; i + 2 < out.length; i += 3) if (out[i + 2] === 'git-crypt') prot.push(out[i]);
  return { files, prot };
}

/** Index blobs of the protected paths that are not ciphertext. */
export function plainCommitted(cwd, prot) {
  return prot.filter((p) => !isLocked(git(cwd, ['cat-file', 'blob', `:${p}`])));
}

export function lockedHere(cwd, prot) {
  return prot.filter((p) => existsSync(join(cwd, p)) && isLocked(readFileSync(join(cwd, p))));
}

/** Distinctive text in a protected file: prose string literals and prompt lines, plus the crisis regex parts. */
export function fragments(text) {
  const out = new Map();
  const add = (s, line) => { if (!out.has(s)) out.set(s, line); };
  const lineAt = (i) => text.slice(0, i).split('\n').length;
  for (const m of text.matchAll(/W`([^`]{20,})`/g)) add(m[1], lineAt(m.index));
  for (const m of text.matchAll(/"((?:[^"\\\n]|\\.){24,})"|'((?:[^'\\\n]|\\.){24,})'|`([^`]{24,})`/g)) {
    let offset = m.index;
    for (const raw of (m[1] ?? m[2] ?? m[3]).split('\n')) {
      const s = raw.trim().replace(/^- /, '');
      if (s.length >= 24 && s.split(/\s+/).length >= 4 && !/[{}=;<>\\]|\$\{|\(\?/.test(s)) add(s, lineAt(offset));
      offset += raw.length + 1;
    }
  }
  return out;
}

/** Public Scripture (KJV, RV 1909) quoted in a fixture is not a secret: drop fragments found there. */
function scripture(cwd) {
  const dir = join(cwd, 'content/bible');
  if (!existsSync(dir)) return '';
  return readdirSync(dir).filter((f) => f.endsWith('.gz')).map((f) => gunzipSync(readFileSync(join(dir, f))).toString()).join('\n');
}

/** The secret text lives in the protected sources; protected tests only quote it (and public replies), so they are not sources. */
export const isSource = (p) => !/\.test\.tsx?$|^app\/test\//.test(p);

export function copies(cwd, files, prot) {
  const bible = scripture(cwd);
  const frags = [];
  for (const p of prot.filter(isSource)) for (const [s, line] of fragments(readFileSync(join(cwd, p), 'utf8'))) if (!bible.includes(s)) frags.push({ s, p, line });
  const found = [];
  const protSet = new Set(prot);
  let scanned = 0;
  for (const f of files) {
    if (protSet.has(f) || !existsSync(join(cwd, f))) continue;
    const buf = readFileSync(join(cwd, f));
    if (buf.length > 8 << 20 || buf.includes(0)) continue; // binary
    scanned++;
    const t = buf.toString('utf8');
    for (const { s, p, line } of frags) if (t.includes(s)) found.push({ file: f, from: p, line });
  }
  return { found, fragments: frags.length, scanned };
}

export function check(cwd, { minFragments = MIN_FRAGMENTS, must = MUST } = {}) {
  const { files, prot } = protectedPaths(cwd);
  const problems = [];
  for (const m of must) if (!prot.includes(m)) problems.push(`NOT_PROTECTED ${m}: not tracked with filter=git-crypt (.gitattributes)`);
  for (const p of plainCommitted(cwd, prot)) problems.push(`PLAIN_TEXT_COMMITTED ${p}: the staged blob is plain text; run scripts/git-crypt-unlock.sh, then git rm --cached and git add it again`);
  const locked = lockedHere(cwd, prot);
  if (locked.length) return { code: 3, lines: [...problems, `NAMED STOP GIT_CRYPT_LOCKED: ${locked.length} protected files are still encrypted here; run: cd ~/GitHub/boss-os && npm run -s vault:run -- bash ${cwd}/scripts/git-crypt-unlock.sh`] };
  const c = copies(cwd, files, prot);
  for (const x of c.found) problems.push(`COPY ${x.file}: holds text from ${x.from} line ${x.line} in plain text; move it into an encrypted file`);
  if (c.fragments < minFragments) problems.push(`FRAGMENTS_TOO_FEW: ${c.fragments} fragments read from ${prot.length} protected files (floor ${minFragments}); the extractor is broken`);
  const out = `OUTPUT encrypted: ${prot.length} files encrypted in git, ${c.fragments} fragments checked across ${c.scanned} plain files, ${c.found.length} copies`;
  return { code: problems.length ? 1 : 0, lines: [...problems, out] };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cwd = git(process.cwd(), ['rev-parse', '--show-toplevel']).toString().trim();
  if (process.argv.includes('--locked')) {
    process.stdout.write(lockedHere(cwd, protectedPaths(cwd).prot).map((p) => `${p}\0`).join(''));
  } else {
    const r = check(cwd);
    for (const l of r.lines) console.log(l);
    process.exit(r.code);
  }
}
