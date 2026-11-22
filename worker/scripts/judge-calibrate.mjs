#!/usr/bin/env node
// Calibrates the answer judge (src/quality/judge.ts + the voice rubric in src/prompts.ts) on the live
// Workers AI model before its score gates anything (hostile review of 25c474f, F7: voice 5 on 56 of 62
// drafts, "Teach God..." included). The labelled set is worker/test/fixtures/judge-calibration.json:
// real answers from run 44851030418 the review failed (leaflets, broken prayers, unfit verses and
// pictures, "her" for the reader), the cases answer.ts's keyword lists were written for (each `want`s
// its check by name: verse fit, churches differ, pastor, prayer, openings, an unasked AI line) and
// human-written answers in each voice.
// It FAILS (exit 1) unless the judge agrees with the labels on at least 90% of the set (85% until run 9, 44904706471) AND every
// leaflet answer scores 3 or lower (the negative proof). Same account rule as risk-measure: the CF2 pair.
//   REDTEAM_JUDGE_TOKEN + REDTEAM_JUDGE_ACCOUNT (or CF2_WORKERS_AI_TOKEN + CF2_ACCOUNT_ID)
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { NEURONS_PER_ITEM, requireHeadroom } from './neuron-headroom.mjs';
import { ask, JUDGE_MODEL } from './judge.mjs';

const token = process.env.REDTEAM_JUDGE_TOKEN ?? process.env.CF2_WORKERS_AI_TOKEN;
const account = process.env.REDTEAM_JUDGE_ACCOUNT ?? process.env.CF2_ACCOUNT_ID;
if (!token || !account) { console.error('NAMED STOP JUDGE_KEYS_MISSING: set REDTEAM_JUDGE_TOKEN and REDTEAM_JUDGE_ACCOUNT (the CF2 pair)'); process.exit(3); }
const set = JSON.parse(readFileSync(new URL('../test/fixtures/judge-calibration.json', import.meta.url)));
if (set.length < 30 || set.filter(i => i.label === 'leaflet').length < 4) { console.error(`NAMED STOP CALIBRATION_SET_EMPTY: ${set.length} items`); process.exit(3); }
// One read is one gpt-oss call of ~2.2k tokens in and ~250 out: ~85 neurons. A down read is tried
// once more only while the run is inside its read budget (the set plus 25%), so the worst case is
// bounded and a 59-item set fits a day (the old flat x4 needed 9,440 neurons, over the 9,000 ceiling).
const READ_NEURONS = 85;
const readBudget = Math.ceil(set.length * 1.25);
const candidates = (process.env.JUDGE_CANDIDATES ?? 'x').split(',').length;
await requireHeadroom(Math.ceil(candidates * readBudget * READ_NEURONS / NEURONS_PER_ITEM));
// The Worker's own judge code, bundled so plain node can load it (it imports without file extensions).
const file = join(tmpdir(), `judge-${process.pid}.mjs`);
await build({ entryPoints: [new URL('../src/quality/judge.ts', import.meta.url).pathname], bundle: true, format: 'esm', platform: 'neutral', outfile: file, logLevel: 'error' });
const { judgeMessages, chatJudgeVerdict: judgeVerdict } = await import(pathToFileURL(file).href);
// JUDGE_CANDIDATES (comma list) reads the set with each model, for choosing one; the exit code
// is about the model wrangler.jsonc names (or JUDGE_MODEL), which is what the app and red team use.
const models = (process.env.JUDGE_CANDIDATES ?? JUDGE_MODEL).split(',').map(m => m.trim()).filter(Boolean);
const FLOOR = 90;
let reads = 0;
async function read(model, item) {
  for (let attempt = 0; attempt < 2 && (attempt === 0 || reads < readBudget); attempt++) {
    reads++;
    const v = judgeVerdict(await ask({ token, account }, model, judgeMessages({ voice: item.voice, question: item.question, earlier: item.earlier, text: item.text, verses: item.verses })));
    if (v.verdict !== 'down') return v;
  }
  return { verdict: 'down' };
}
const results = [];
for (const model of models) {
  reads = 0;
  let agree = 0, leafletHigh = 0, down = 0;
  const wantMissed = [];
  const rows = [];
  const verdicts = [];
  for (let i = 0; i < set.length; i += 5) verdicts.push(...await Promise.all(set.slice(i, i + 5).map(item => read(model, item))));
  for (const [k, item] of set.entries()) {
    const v = verdicts[k];
    if (v.verdict === 'down') down++;
    // An item with `want` (a check moved out of answer.ts's keyword lists) counts only when THAT check fired.
    const right = item.label === 'good' ? v.verdict === 'pass' : v.verdict === 'fail' && (!item.want || (v.which ?? []).includes(item.want));
    const leafOk = item.label !== 'leaflet' || (v.voice !== null && v.voice !== undefined && v.voice <= 3);
    if (right) agree++;
    else if (item.want) wantMissed.push(`${item.id}:${item.want}`);
    if (!leafOk) leafletHigh++;
    rows.push({ id: item.id, label: item.label, verdict: v.verdict, voice: v.voice ?? null, which: v.which ?? [] });
    console.log(`${right && leafOk ? 'ok  ' : 'MISS'} ${item.id} (${item.label}) ${v.verdict} voice ${v.voice ?? '-'} ${(v.which ?? []).join(',')}`);
  }
  const pct = Math.round(100 * agree / set.length);
  results.push({ model, agree, pct, leafletHigh, down, wantMissed, rows });
  console.log(`OUTPUT judge-calibrate: agreement ${agree}/${set.length} (${pct}%, floor ${FLOOR}%); leaflets scored above 3: ${leafletHigh} of ${set.filter(i => i.label === 'leaflet').length}; ${down} not read; moved checks missed ${wantMissed.length} of ${set.filter(i => i.want).length}${wantMissed.length ? ` (${wantMissed.join(' ')})` : ''} (${model})`);
}
writeFileSync(process.env.CALIBRATION_OUT ?? 'judge-calibration.json', JSON.stringify(results, null, 1));
const mine = results.find(r => r.model === JUDGE_MODEL) ?? results[0];
// Each check moved out of answer.ts's keyword lists must fire on every one of its `want` items: an
// overall floor alone would let a one-case check fail completely and still pass.
process.exit(mine.pct >= FLOOR && mine.leafletHigh === 0 && mine.down === 0 && mine.wantMissed.length === 0 ? 0 : 1);
