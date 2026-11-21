#!/usr/bin/env node
// Measures made-for-you drafting on the REAL free chain: phase 3's providers and ladder, made-for-you's
// production caps (madeForYouRungs), the real content check (phase 3's checkAnswer on every paragraph,
// the session floors) and the real judge, over 8 made-up notes (EN/ES x Psalm/Imagination x 2), each
// given the Worker's 3 tries. Prints the pass rate, the draft and judge calls per session, the claim
// time and every reject reason (codes only), and writes the passing scripts for the voice step.
// Re-run after any change to the draft prompt, the caps, the content check or the models, and monthly.
// Runs ONLY on the second Cloudflare account for Workers AI (CF2_ACCOUNT_ID + CF2_WORKERS_AI_TOKEN, or
// the PBS_RT_CF_* GitHub secrets), with PBS_GEMINI_API_KEY and OPENROUTER_API_KEY, on GitHub:
//   PBS_CHAT_SOURCE=<phase 3 checkout> node worker/scripts/made-for-you-measure.mjs <out.json>
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { build } from '../../app/node_modules/esbuild/lib/main.js';
import ts from '../../app/node_modules/typescript/lib/typescript.js';

const out = process.argv[2] ?? 'made-for-you-measure.json';
const account = process.env.CF2_ACCOUNT_ID;
const token = process.env.CF2_WORKERS_AI_TOKEN;
const secrets = { PBS_GEMINI_API_KEY: process.env.PBS_GEMINI_API_KEY, OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY };
if (!account || !token || !secrets.OPENROUTER_API_KEY) {
  console.error('NAMED STOP MADE_FOR_YOU_MEASURE_KEYS: set CF2_ACCOUNT_ID, CF2_WORKERS_AI_TOKEN, OPENROUTER_API_KEY (and PBS_GEMINI_API_KEY)');
  process.exit(3);
}
const chat = resolve(process.env.PBS_CHAT_SOURCE ?? '../.wt-peace-be-still-phase-3');
const { config: wrangler } = ts.parseConfigFileTextToJson('wrangler.jsonc', readFileSync(resolve(chat, 'worker/wrangler.jsonc'), 'utf8'));
const bundle = await build({
  stdin: {
    contents: `export * from './worker/src/madeForYou.ts'; export { banned } from 'phase-3/worker/src/shared';
      export { realDeps } from 'phase-3/worker/src/index';
      export { runLadder } from 'phase-3/worker/src/ladder';
      export { checkAnswer } from 'phase-3/worker/src/quality/answer';
      export { judgeSchema, judgeVerdict } from 'phase-3/worker/src/quality/judge';`,
    resolveDir: process.cwd(), loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', write: false, alias: { 'phase-3': chat }, external: ['cloudflare:*'],
});
const m = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

// D1 stand-in on node:sqlite: the ladder's counters and the Bible table checkAnswer reads.
const sqlite = new DatabaseSync(':memory:');
sqlite.exec('CREATE TABLE chat_counts (day TEXT NOT NULL, metric TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, metric))');
sqlite.exec(readFileSync(resolve(chat, 'worker/migrations/0003_bible.sql'), 'utf8').replace(/^INSERT.*$/m, ''));
const db = {
  prepare(sql) {
    let params = [];
    const statement = { bind: (...values) => { params = values; return statement; },
      first: async () => sqlite.prepare(sql).get(...params) ?? null,
      all: async () => ({ results: sqlite.prepare(sql).all(...params) }),
      run: async () => { const r = sqlite.prepare(sql).run(...params); return { meta: { changes: r.changes } }; } };
    return statement;
  },
};
// Workers AI binding stand-in: the REST API on the second account.
const AI = {
  async run(model, inputs) {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`, {
      method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify(inputs), signal: AbortSignal.timeout(120_000),
    });
    const j = await res.json();
    if (!j.success) throw new Error(`${res.status} ${JSON.stringify(j.errors ?? []).slice(0, 200)}`);
    return j.result;
  },
};
const env = { ...wrangler.vars, ...secrets, AI, DB: db };

const notes = [
  ['en', 'psalm', 'Work has been heavy and I keep replaying a hard conversation from today.'],
  ['en', 'psalm', 'My mother is in the hospital and I feel far away from her tonight.'],
  ['es', 'psalm', 'Estoy preocupada por mi hijo, que se mudó lejos este año.'],
  ['es', 'psalm', 'El trabajo me tiene cansada y no logro descansar por las noches.'],
  ['en', 'imagination', 'I want to feel calm and ready before a big interview on Friday.'],
  ['en', 'imagination', 'I would like to picture a quiet beach after a loud, busy week.'],
  ['es', 'imagination', 'Quiero sentir paz en una cabaña en la montaña, lejos del ruido.'],
  ['es', 'imagination', 'Me gustaría imaginar un jardín tranquilo después de un día largo.'],
];
const cfg = m.allowanceBooks(wrangler.vars) && JSON.parse(readFileSync('worker/src/madeForYou.config.json', 'utf8'));
// Real calls are the ladder's own tallies (ok/429/malformed/fail/exhausted per rung). The counters are not:
// a provider's "out for today" sets its counter to the cap without any call being made.
const metrics = new Map();
const calls = () => { const o = {}; for (const [k, n] of metrics) { const at = k.indexOf(':'); if (k.slice(0, at) !== 'capped') o[`calls:${k.slice(at + 1)}`] = (o[`calls:${k.slice(at + 1)}`] ?? 0) + n; } return o; };
const sum = (o, use) => Object.entries(o).filter(([k]) => k.startsWith(`calls:mfy:${use}:`)).reduce((s, [, n]) => s + n, 0);
const sessions = [];
for (const [lang, kind, text] of notes) {
  const input = { kind, lang, teen: false, text };
  const tries = [];
  let passed = null;
  const before = calls();
  const started = Date.now();
  for (let attempt = 1; attempt <= 3 && !passed; attempt++) {
    const t0 = Date.now();
    const signal = AbortSignal.timeout(240_000);
    const ladder = (use, messages, schema, maxTokens, valid) =>
      m.runLadder(db, m.madeForYouRungs(m.realDeps.rungs(env, Date.now()), use, signal), messages, schema, maxTokens, metrics, valid);
    const shapes = [];
    const drafted = await ladder('draft', m.draftMessages({ kind, lang, teen: 0 }, text, m.banned), m.draftSchema,
      cfg.draftMaxTokens, value => {
        const ok = m.draftText(value) !== null;
        if (Array.isArray(value?.paragraphs)) shapes.push(value.paragraphs.map(p => String(p).split(/\s+/).filter(Boolean).length));
        return ok;
      }).catch(e => ({ empty: `error:${String(e).slice(0, 60)}` }));
    if ('empty' in drafted) { tries.push({ attempt, outcome: `no_draft:${drafted.empty}`, misshapenWords: shapes, ms: Date.now() - t0 }); continue; }
    const reasons = [];
    const judge = (i, script, s) => m.madeForYouJudge((msgs, schema, valid) => ladder('judge', msgs, schema, cfg.judgeMaxTokens, valid), { schema: m.judgeSchema, verdict: m.judgeVerdict }, i, script, r => reasons.push(r));
    const reflection = m.draftText(drafted.data);
    const verdict = await m.madeForYouApprove((d, ctx) => m.checkAnswer(d, { ...ctx, db }), judge, input, reflection, signal, r => reasons.push(r));
    tries.push({ attempt, rung: drafted.rung, words: reflection.split(/\s+/).length, misshapenWords: shapes, outcome: verdict, reasons, ms: Date.now() - t0 });
    if (verdict === 'pass') passed = reflection;
  }
  const after = calls();
  const draftCalls = sum(after, 'draft') - sum(before, 'draft');
  const judgeCalls = sum(after, 'judge') - sum(before, 'judge');
  sessions.push({ lang, kind, passed: !!passed, attempts: tries.length, draftCalls, judgeCalls, ms: Date.now() - started, tries, reflection: passed });
  console.log(`${passed ? 'PASS' : 'STOP'} ${lang} ${kind}: ${tries.length} tries, ${draftCalls} draft + ${judgeCalls} judge calls, ${((Date.now() - started) / 1000).toFixed(0)} s :: ${tries.map(t => `${t.rung ?? '-'} ${t.words ?? t.misshapenWords} ${t.outcome} ${(t.reasons ?? []).join(',')}`).join(' | ')}`);
}
const passedSessions = sessions.filter(s => s.passed);
const mean = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const summary = {
  measuredAt: new Date().toISOString(), notes: sessions.length, passed: passedSessions.length,
  passRate: passedSessions.length / sessions.length,
  draftCallsPerSession: mean(sessions.map(s => s.draftCalls)), judgeCallsPerSession: mean(sessions.map(s => s.judgeCalls)),
  maxDraftCalls: Math.max(...sessions.map(s => s.draftCalls)), maxJudgeCalls: Math.max(...sessions.map(s => s.judgeCalls)),
  claimSecondsMean: mean(sessions.flatMap(s => s.tries.map(t => t.ms))) / 1000,
  claimSecondsMax: Math.max(...sessions.flatMap(s => s.tries.map(t => t.ms))) / 1000,
  rungs: calls(),
};
writeFileSync(out, JSON.stringify({ summary, sessions }, null, 2));
console.log(`OUTPUT made-for-you-measure: ${summary.passed}/${summary.notes} passed, ${summary.draftCallsPerSession.toFixed(2)} draft + ${summary.judgeCallsPerSession.toFixed(2)} judge calls a session, claim ${summary.claimSecondsMean.toFixed(0)} s mean / ${summary.claimSecondsMax.toFixed(0)} s max`);
// Rule 0: a run that measured nothing fails.
process.exit(sessions.length === notes.length ? 0 : 1);
