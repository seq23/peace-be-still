#!/usr/bin/env node
// Re-reads a red-team run's saved transcripts with the judge (scripts/judge.mjs), so a change of
// judge model is measured on the same answers, not on a fresh run. Usage: rejudge.mjs <redteam-out dir>
// Keys: REDTEAM_JUDGE_TOKEN + REDTEAM_JUDGE_ACCOUNT. JUDGE_MODEL overrides the wrangler.jsonc model.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { JUDGE_MODEL, readExpectation } from './judge.mjs';

const dir = process.argv[2];
const keys = { token: process.env.REDTEAM_JUDGE_TOKEN, account: process.env.REDTEAM_JUDGE_ACCOUNT };
if (!dir || !existsSync(dir)) { console.error('NAMED STOP REJUDGE_DIR_MISSING'); process.exit(3); }
if (!process.argv.includes('--dry') && (!keys.token || !keys.account)) { console.error('NAMED STOP JUDGE_KEYS_MISSING'); process.exit(3); }
// Older runs saved only the .md transcript: read it back (prompt, each reply, the verses under it).
function fromMd(s) {
  const expect = /^Expectation: (.*)$/m.exec(s)?.[1];
  if (!expect) return null;
  const head = s.slice(s.indexOf('Prompt: ') + 8, s.indexOf('\n\nKind: '));
  const prompt = head.split('\n').map(l => l.replace(/^> /, '')).join('\n> ');
  const kind = /^Kind: (\S+)/m.exec(s)[1];
  const body = s.slice(s.indexOf(' ms\n\n') + 5, s.indexOf('\n\nChecks'));
  const part = seg => {
    const lines = seg.split('\n');
    const scripture = lines.filter(l => l.startsWith('> ')).map(l => { const m = /^> (.+?) \((\w+)\): (.*)$/.exec(l); return m ? { ref: m[1], translation: m[2], text: m[3] } : null; }).filter(Boolean);
    return { text: lines.filter(l => l && !l.startsWith('> ')).join(' ').trim(), scripture };
  };
  const turns = body.split(/^Turn \d+ \((\w+)\):\n/m);
  const r = turns.length > 1 ? { kind, all: turns.slice(1).reduce((a, x, i, arr) => (i % 2 ? a : [...a, { kind: x, ...part(arr[i + 1] ?? '') }]), []) } : { kind, ...part(body) };
  return { prompt, expect: { judge: expect }, r };
}
const items = [];
for (const f of readdirSync(dir).filter(f => f.endsWith('.md')).sort()) {
  const id = f.slice(0, -3);
  const json = `${dir}/${id}.json`;
  const it = existsSync(json) ? JSON.parse(readFileSync(json, 'utf8')) : fromMd(readFileSync(`${dir}/${f}`, 'utf8'));
  if (it?.expect?.judge && it.r.kind !== 'busy' && it.r.kind !== 'no_free_model') items.push({ id, ...it });
}
if (items.length < 10) { console.error(`NAMED STOP REJUDGE_EMPTY: ${items.length} items with an expectation`); process.exit(3); }
if (process.argv.includes('--dry')) { for (const it of items) console.log(it.id, it.r.kind, (it.r.all ?? [it.r]).map(x => `${x.kind}:${x.text.length}/${x.scripture.length}`).join(' ')); process.exit(0); }
const unmet = []; let notRead = 0;
for (let i = 0; i < items.length; i += 4) {
  await Promise.all(items.slice(i, i + 4).map(async it => {
    const v = await readExpectation(keys, { expect: it.expect }, it.prompt, it.r);
    if (!v) { notRead++; console.log(`NOT READ ${it.id}`); return; }
    if (!v.met) { unmet.push(it.id); console.log(`UNMET ${it.id}: ${v.missing}`); }
  }));
}
console.log(`OUTPUT rejudge: ${items.length} expectations, ${unmet.length} unmet (${unmet.sort().join(', ')}), ${notRead} not read (${JUDGE_MODEL})`);
process.exit(notRead ? 1 : 0);
