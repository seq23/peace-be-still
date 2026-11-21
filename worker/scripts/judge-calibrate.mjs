#!/usr/bin/env node
// Calibrates the answer judge (src/quality/judge.ts + the voice rubric in src/prompts.ts) on the live
// Workers AI model before its score gates anything (hostile review of 25c474f, F7: voice 5 on 56 of 62
// drafts, "Teach God..." included). The labelled set is worker/test/fixtures/judge-calibration.json:
// real answers from run 44851030418 the review failed (leaflets, broken prayers, unfit verses and
// pictures, "her" for the reader) and human-written answers in each voice.
// It FAILS (exit 1) unless the judge agrees with the labels on at least 85% of the set AND every
// leaflet answer scores 3 or lower (the negative proof). Same account rule as risk-measure: the CF2 pair.
//   REDTEAM_JUDGE_TOKEN + REDTEAM_JUDGE_ACCOUNT (or CF2_WORKERS_AI_TOKEN + CF2_ACCOUNT_ID)
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { requireHeadroom } from './neuron-headroom.mjs';

const token = process.env.REDTEAM_JUDGE_TOKEN ?? process.env.CF2_WORKERS_AI_TOKEN;
const account = process.env.REDTEAM_JUDGE_ACCOUNT ?? process.env.CF2_ACCOUNT_ID;
if (!token || !account) { console.error('NAMED STOP JUDGE_KEYS_MISSING: set REDTEAM_JUDGE_TOKEN and REDTEAM_JUDGE_ACCOUNT (the CF2 pair)'); process.exit(3); }
const set = JSON.parse(readFileSync(new URL('../test/fixtures/judge-calibration.json', import.meta.url)));
if (set.length < 30 || set.filter(i => i.label === 'leaflet').length < 4) { console.error(`NAMED STOP CALIBRATION_SET_EMPTY: ${set.length} items`); process.exit(3); }
await requireHeadroom(set.length);
// The Worker's own judge code, bundled so plain node can load it (it imports without file extensions).
const file = join(tmpdir(), `judge-${process.pid}.mjs`);
await build({ entryPoints: [new URL('../src/quality/judge.ts', import.meta.url).pathname], bundle: true, format: 'esm', platform: 'neutral', outfile: file, logLevel: 'error' });
const { judgeMessages, judgeSchema, judgeVerdict } = await import(pathToFileURL(file).href);
const model = /"WORKERS_AI_JUDGE_MODEL": "([^"]+)"/.exec(readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8'))[1];

async function read(item) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, {
        method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, signal: AbortSignal.timeout(30_000),
        body: JSON.stringify({ messages: judgeMessages({ voice: item.voice, question: item.question, text: item.text, verses: item.verses }), response_format: { type: 'json_schema', json_schema: judgeSchema }, max_tokens: 200, temperature: 0 }),
      });
      const j = await res.json();
      let data = j.result?.response; if (typeof data === 'string') try { data = JSON.parse(data); } catch {}
      const v = judgeVerdict(data);
      if (v.verdict !== 'down') return v;
    } catch { /* one more try */ }
  }
  return { verdict: 'down' };
}
let agree = 0, leafletHigh = 0, down = 0;
const rows = [];
for (const item of set) {
  const v = await read(item);
  if (v.verdict === 'down') down++;
  const right = item.label === 'good' ? v.verdict === 'pass' : v.verdict === 'fail';
  const leafOk = item.label !== 'leaflet' || (v.voice !== null && v.voice !== undefined && v.voice <= 3);
  if (right) agree++;
  if (!leafOk) leafletHigh++;
  rows.push({ id: item.id, label: item.label, verdict: v.verdict, voice: v.voice ?? null, which: v.which ?? [] });
  console.log(`${right && leafOk ? 'ok  ' : 'MISS'} ${item.id} (${item.label}) ${v.verdict} voice ${v.voice ?? '-'} ${(v.which ?? []).join(',')}`);
}
writeFileSync(process.env.CALIBRATION_OUT ?? 'judge-calibration.json', JSON.stringify(rows, null, 1));
const pct = Math.round(100 * agree / set.length);
console.log(`OUTPUT judge-calibrate: agreement ${agree}/${set.length} (${pct}%, floor 85%); leaflets scored above 3: ${leafletHigh} of ${set.filter(i => i.label === 'leaflet').length}; ${down} not read (${model})`);
process.exit(pct >= 85 && leafletHigh === 0 && down === 0 ? 0 : 1);
