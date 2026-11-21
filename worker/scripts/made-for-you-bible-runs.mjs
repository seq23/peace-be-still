#!/usr/bin/env node
// Loads bible_runs (migration 0010): every 7-word run of every verse of the app's own Bible files
// (app/src/bible/data/{kjv,rv1909}.db, the same source as scripts/worker-bible-load.mjs), hashed by the lane's own
// runHash, so Made for you can refuse Scripture written word for word into a script (madeForYou.ts verbatimScripture).
// scripts/worker-deploy.sh runs it after the verse load on every deploy; it rebuilds
// only when the Bible version or the row count is off. Usage: node worker/scripts/made-for-you-bible-runs.mjs --local | --remote
import { DatabaseSync } from 'node:sqlite';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from '../../app/node_modules/esbuild/lib/main.js';

const where = process.argv.includes('--remote') ? '--remote' : process.argv.includes('--local') ? '--local' : null;
if (!where) { console.error('usage: made-for-you-bible-runs.mjs --local | --remote'); process.exit(2); }
const bundle = await build({ entryPoints: ['worker/src/madeForYou.ts'], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'error' });
const { bibleRunRows } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const wrangler = (...args) => execFileSync('npx', ['--prefix', 'worker', 'wrangler', 'd1', 'execute', 'peace-be-still-chat', '--config', 'worker/wrangler.jsonc', where, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const q = s => `'${String(s).replace(/'/g, "''")}'`;
const one = sql => JSON.parse(wrangler('--json', '--command', sql))[0]?.results?.[0];
let total = 0;
for (const [translation, file] of [['KJV', 'kjv'], ['RV1909', 'rv1909']]) {
  const source = new DatabaseSync(`app/src/bible/data/${file}.db`, { readOnly: true });
  const version = source.prepare("SELECT value FROM meta WHERE key = 'version'").get().value;
  const verses = source.prepare('SELECT book, chapter, verse, text FROM verses ORDER BY id').all();
  if (verses.length < 31000) { console.error(`NAMED STOP BIBLE_SOURCE_SHORT: ${translation} has ${verses.length} verses`); process.exit(3); }
  const rows = [...bibleRunRows(translation, verses)];
  // Idempotent: the same Bible version with every run present is left as it is (a deploy re-run costs two reads).
  const meta = one(`SELECT version, runs FROM bible_runs_meta WHERE translation = ${q(translation)}`);
  const have = one(`SELECT count(*) AS n FROM bible_runs WHERE translation = ${q(translation)}`)?.n ?? 0;
  if (meta?.version === version && meta.runs === rows.length && have === rows.length) {
    if (!have) { console.error(`NAMED STOP MADE_FOR_YOU_BIBLE_RUNS_EMPTY: ${translation}`); process.exit(3); }
    total += have; console.log(`OUTPUT bible runs ${translation}: ${have} runs, version ${version} already loaded`); continue;
  }
  const lines = [`DELETE FROM bible_runs WHERE translation = ${q(translation)};`];
  for (let i = 0; i < rows.length; i += 500) {
    lines.push(`INSERT INTO bible_runs (translation, h, book, chapter, verse) VALUES ${rows.slice(i, i + 500).map(([h, r]) => `(${q(translation)},${h},${q(r.book)},${r.chapter},${r.verse})`).join(',')};`);
  }
  const sql = join(mkdtempSync(join(tmpdir(), 'pbs-runs-')), `${file}.sql`);
  writeFileSync(sql, lines.join('\n'));
  wrangler('--file', sql, '--yes');
  const count = JSON.parse(wrangler('--json', '--command', `SELECT count(*) AS n FROM bible_runs WHERE translation = ${q(translation)}`))[0].results[0].n;
  if (!count || count !== rows.length) { console.error(`NAMED STOP BIBLE_RUNS_SHORT: ${translation} ${count} of ${rows.length}`); process.exit(3); }
  wrangler('--command', `INSERT INTO bible_runs_meta (translation, version, runs) VALUES (${q(translation)}, ${q(version)}, ${count}) ON CONFLICT(translation) DO UPDATE SET version = excluded.version, runs = excluded.runs`);
  total += count;
  console.log(`OUTPUT bible runs ${translation}: ${count} runs from ${verses.length} verses, version ${version}`);
}
// Rule 0: a deploy that leaves no index would hold every session; it fails here instead.
if (!total) { console.error('NAMED STOP MADE_FOR_YOU_BIBLE_RUNS_EMPTY: no runs in D1'); process.exit(3); }
console.log(`OUTPUT bible runs: ${total} rows in D1`);
