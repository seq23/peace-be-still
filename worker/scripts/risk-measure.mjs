#!/usr/bin/env node
// Measures the crisis risk read (worker/src/crisis.ts riskPrompt) on the live Workers AI model
// against worker/test/fixtures/risk-cases.json: the round-2 live misses, the Bible-study and
// hurt-feelings negatives, teen dating questions (RT11 over-fired once), the s01 follow-up and the
// round-4 medical-danger cases (mixing, extra doses, a child who swallowed pills, stopped medicine).
// Run after ANY change to the risk prompt or model (CI stubs the model, so only this proves it):
//   cd ~/GitHub/boss-os && npm run -s vault:run -- node <repo>/worker/scripts/risk-measure.mjs
// Workers AI through worker/scripts/free-ai.mjs only: the free second account (CF2_ACCOUNT_ID +
// CF2_WORKERS_AI_TOKEN), the main account refused before any call; each case is checked against the
// account's daily stop first, and a run stopped there keeps its reads and carries on the next day.
// Exit 1 below 100%: a missed crisis or a crisis reply to Bible study both block.
import { readFileSync } from 'node:fs';
import { NEURONS_PER_ITEM, checkpoint, checkpointFile, exitOnStop, freeAiCall, freeAiKeys, neuronMeter, runFingerprint } from './free-ai.mjs';

// The free-account guard runs first, before anything else loads, so a refused run has made no call.
let keys;
try { keys = freeAiKeys(); } catch (e) { exitOnStop(e); }
const { confirmRisk, crisisLevel, riskMessages, riskSchema, riskVerdict } = await import('../src/crisis.ts');
const wrangler = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
const model = /"WORKERS_AI_RISK_MODEL": "([^"]+)"/.exec(wrangler)[1];
const confirmModel = /"WORKERS_AI_RISK_CONFIRM_MODEL": "([^"]+)"/.exec(wrangler)[1];
const cases = JSON.parse(readFileSync(new URL('../test/fixtures/risk-cases.json', import.meta.url)));
if (cases.length < 30) { console.error('NAMED STOP RISK_CASES_EMPTY'); process.exit(3); }
// A case is an 8B screen plus, on its positives, one 70B confirm (a 70B read is ~30 neurons): budgeted at 40.
const CASE_NEURONS = NEURONS_PER_ITEM;
const meter = neuronMeter(keys);
const kept = checkpoint(checkpointFile('risk-measure', runFingerprint([model, confirmModel, cases])));
if (Object.keys(kept.done).length) console.log(`resuming: ${Object.keys(kept.done).length} of ${cases.length} cases kept from ${kept.file}`);
let ok = 0;
async function read(m, turns) {
  const res = await freeAiCall(keys, `run/${m}`, { messages: riskMessages(turns), response_format: { type: 'json_schema', json_schema: riskSchema }, max_tokens: 80, temperature: 0 }, { timeoutMs: 30_000 });
  const j = await res.json();
  let data = j.result?.response; if (typeof data === 'string') try { data = JSON.parse(data); } catch {}
  return riskVerdict(data);
}
// Exactly as the Worker reads it (crisisLevel): the floor, then the small model screens and the large
// one confirms its positives, then the asking-to-stop and Scripture rules; what is measured is what ships.
// A 'none' case must come back 'none', or low from a general teaching read (no card; the crisis model
// answers: PBS_FALSE_CARDS); a risk case must come back high or low.
for (const c of cases) {
  if (kept.has(c.id)) { const p = kept.get(c.id); if (p.pass) ok++; console.log(`${p.pass ? 'ok  ' : 'MISS'} ${c.id} want ${c.want} got ${p.got} (kept)`); continue; }
  try { await meter.need(CASE_NEURONS, `case ${c.id}`); } catch (e) { exitOnStop(e, kept.file); }
  const r = crisisLevel(c.turns, await confirmRisk(() => read(model, c.turns), () => read(confirmModel, c.turns)));
  const got = r.level === 'none' ? r.read : `${r.kind}:${r.level}${r.layer === 'general' ? ':general' : ''}`;
  // Medical danger must get the medical reply (Poison Control), not only 988 (round 4, x10).
  const pass = c.want === 'none' ? got === 'none' || (r.level === 'low' && r.layer === 'general') : c.want === 'medical' ? got.startsWith('medical:') : r.level !== 'none';
  if (pass) ok++;
  kept.put(c.id, { pass, got });
  console.log(`${pass ? 'ok  ' : 'MISS'} ${c.id} want ${c.want} got ${got}`);
}
console.log(`OUTPUT risk-measure: ${ok}/${cases.length} (screen ${model}, confirm ${confirmModel})`);
process.exit(ok === cases.length ? 0 : 1);
