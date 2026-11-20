#!/usr/bin/env node
// Loads the chat Worker's verse table (D1 bible_verses) from the app's own Bible files,
// app/src/bible/data/{kjv,rv1909}.db (built from content/bible/*.gz by scripts/import-bibles.py).
// One source, no copy in git. Skips a translation whose version is already loaded.
// Usage: node scripts/worker-bible-load.mjs --local | --remote
import { DatabaseSync } from 'node:sqlite';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const where = process.argv.includes('--remote') ? '--remote' : process.argv.includes('--local') ? '--local' : null;
if (!where) { console.error('usage: worker-bible-load.mjs --local | --remote'); process.exit(2); }
const wrangler = (...args) => execFileSync('npx', ['--prefix', 'worker', 'wrangler', 'd1', 'execute', 'peace-be-still-chat', '--config', 'worker/wrangler.jsonc', where, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
const q = s => `'${String(s).replace(/'/g, "''")}'`;
let loaded = 0;
for (const [translation, file] of [['KJV', 'kjv'], ['RV1909', 'rv1909']]) {
  const db = new DatabaseSync(`app/src/bible/data/${file}.db`, { readOnly: true });
  const version = db.prepare("SELECT value FROM meta WHERE key = 'version'").get().value;
  const current = JSON.parse(wrangler('--json', '--command', `SELECT version FROM bible_meta WHERE translation = ${q(translation)}`))[0]?.results?.[0]?.version;
  if (current === version) { console.log(`OUTPUT bible ${translation}: version ${version} already loaded`); continue; }
  const rows = db.prepare('SELECT book, chapter, verse, text FROM verses ORDER BY id').all();
  if (rows.length < 31000) { console.error(`NAMED STOP BIBLE_SOURCE_SHORT: ${translation} has ${rows.length} verses`); process.exit(3); }
  const lines = [`DELETE FROM bible_verses WHERE translation = ${q(translation)};`];
  for (let i = 0; i < rows.length; i += 200) {
    lines.push(`INSERT INTO bible_verses (translation, book, chapter, verse, text) VALUES ${rows.slice(i, i + 200).map(r => `(${q(translation)},${q(r.book)},${r.chapter},${r.verse},${q(r.text)})`).join(',')};`);
  }
  lines.push(`INSERT INTO bible_meta (translation, version) VALUES (${q(translation)}, ${q(version)}) ON CONFLICT(translation) DO UPDATE SET version = excluded.version;`);
  const sql = join(mkdtempSync(join(tmpdir(), 'pbs-bible-')), `${file}.sql`);
  writeFileSync(sql, lines.join('\n'));
  wrangler('--file', sql, '--yes');
  const count = JSON.parse(wrangler('--json', '--command', `SELECT count(*) AS n FROM bible_verses WHERE translation = ${q(translation)}`))[0].results[0].n;
  if (count !== rows.length) { console.error(`NAMED STOP BIBLE_LOAD_SHORT: ${translation} ${count} of ${rows.length}`); process.exit(3); }
  loaded++;
  console.log(`OUTPUT bible ${translation}: ${count} verses loaded, version ${version}`);
}
console.log(`OUTPUT bible: ${loaded} translation(s) loaded`);
