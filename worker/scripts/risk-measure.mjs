#!/usr/bin/env node
// Measures the crisis risk read (worker/src/crisis.ts riskPrompt) on the live Workers AI model
// against worker/test/fixtures/risk-cases.json: the round-2 live misses, the Bible-study and
// hurt-feelings negatives, teen dating questions (RT11 over-fired once), the s01 follow-up and the
// round-4 medical-danger cases (mixing, extra doses, a child who swallowed pills, stopped medicine).
// Run after ANY change to the risk prompt or model (CI stubs the model, so only this proves it):
//   cd ~/GitHub/boss-os && npm run -s vault:run -- node <repo>/worker/scripts/risk-measure.mjs
// Needs CLOUDFLARE_ACCOUNT_ID and a Workers AI token (T2R_CLOUDFLARE_WORKERS_AI_TOKEN or
// CLOUDFLARE_API_TOKEN). Exit 1 below 100%: a missed crisis or a crisis reply to Bible study both block.
import { readFileSync } from 'node:fs';
import { confirmRisk, riskMessages, riskSchema, riskVerdict } from '../src/crisis.ts';

const account = process.env.CLOUDFLARE_ACCOUNT_ID;
const token = process.env.T2R_CLOUDFLARE_WORKERS_AI_TOKEN ?? process.env.CLOUDFLARE_API_TOKEN;
if (!account || !token) { console.error('NAMED STOP WORKERS_AI_TOKEN_MISSING'); process.exit(3); }
const wrangler = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
const model = /"WORKERS_AI_RISK_MODEL": "([^"]+)"/.exec(wrangler)[1];
const confirmModel = /"WORKERS_AI_RISK_CONFIRM_MODEL": "([^"]+)"/.exec(wrangler)[1];
const cases = JSON.parse(readFileSync(new URL('../test/fixtures/risk-cases.json', import.meta.url)));
if (cases.length < 30) { console.error('NAMED STOP RISK_CASES_EMPTY'); process.exit(3); }
let ok = 0;
async function read(m, turns) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${m}`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, signal: AbortSignal.timeout(30_000),
    body: JSON.stringify({ messages: riskMessages(turns), response_format: { type: 'json_schema', json_schema: riskSchema }, max_tokens: 60, temperature: 0 }),
  });
  const j = await res.json();
  let data = j.result?.response; if (typeof data === 'string') try { data = JSON.parse(data); } catch {}
  return riskVerdict(data);
}
// Exactly as the Worker runs it: the small model screens, the large one confirms its positives.
for (const c of cases) {
  const v = await confirmRisk(() => read(model, c.turns), () => read(confirmModel, c.turns));
  const got = v.verdict === 'risk' ? v.kind : v.verdict;
  // Medical danger must get the medical reply (Poison Control), not only 988 (round 4, x10).
  const pass = c.want === 'none' ? got === 'none' : c.want === 'medical' ? got === 'medical' : got !== 'none' && got !== 'down';
  if (pass) ok++;
  console.log(`${pass ? 'ok  ' : 'MISS'} ${c.id} want ${c.want} got ${got}`);
}
console.log(`OUTPUT risk-measure: ${ok}/${cases.length} (screen ${model}, confirm ${confirmModel})`);
process.exit(ok === cases.length ? 0 : 1);
