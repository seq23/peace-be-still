#!/usr/bin/env node
// Re-reads a red-team run's saved transcripts with the judge (scripts/judge.mjs), so a change of
// judge model is measured on the same answers, not on a fresh run. Usage: rejudge.mjs <redteam-out dir>
// Workers AI through worker/scripts/free-ai.mjs only (the free second account; the main account refused
// before any call); each batch is checked against the daily stop, and a stopped run carries on the next day.
// JUDGE_MODEL names another Workers AI judge model to measure (still on the free account).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { checkpoint, checkpointFile, exitOnStop, freeAiKeys, neuronMeter, runFingerprint } from './free-ai.mjs';

// The free-account guard runs first, before anything else loads, so a refused run has made no call.
let keys = null;
if (!process.argv.includes('--dry')) try { keys = freeAiKeys(); } catch (e) { exitOnStop(e); }
const { JUDGE_MODEL, readExpectation } = await import('./judge.mjs');
const dir = process.argv[2];
if (!dir || !existsSync(dir)) { console.error('NAMED STOP REJUDGE_DIR_MISSING'); process.exit(3); }
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
// One expectation read is one judge call (budgeted at 85 neurons, as judge-calibrate measures gpt-oss).
const READ_NEURONS = 85;
const meter = neuronMeter(keys);
const kept = checkpoint(checkpointFile('rejudge', runFingerprint([JUDGE_MODEL, items])));
if (Object.keys(kept.done).length) console.log(`resuming: ${Object.keys(kept.done).length} of ${items.length} reads kept from ${kept.file}`);
const unmet = []; let notRead = 0;
for (let i = 0; i < items.length; i += 4) {
  const todo = items.slice(i, i + 4).filter(it => !kept.has(it.id));
  if (todo.length) try { await meter.need(todo.length * READ_NEURONS, `reads ${i + 1}-${i + 4}`); } catch (e) { exitOnStop(e, kept.file); }
  await Promise.all(items.slice(i, i + 4).map(async it => {
    const v = kept.has(it.id) ? kept.get(it.id) : await readExpectation(keys, { expect: it.expect }, it.prompt, it.r);
    if (v && !kept.has(it.id)) kept.put(it.id, v);
    if (!v) { notRead++; console.log(`NOT READ ${it.id}`); return; }
    if (!v.met) { unmet.push(it.id); console.log(`UNMET ${it.id}: ${v.missing}`); }
  }));
}
console.log(`OUTPUT rejudge: ${items.length} expectations, ${unmet.length} unmet (${unmet.sort().join(', ')}), ${notRead} not read (${JUDGE_MODEL})`);
process.exit(notRead ? 1 : 0);
