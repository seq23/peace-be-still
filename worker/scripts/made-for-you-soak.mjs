#!/usr/bin/env node
// One real night of Made for you on the free chain, as production runs it: the lane integrated into
// phase 3 (worker/integration/apply.sh), the Worker's own claim endpoint through madeForYou.mount.ts with
// phase 3's real rungs, ladder, checkAnswer and judge, the production caps, backoffs and leases, and the
// Mac's pass shape (a pass every 15 minutes drains the queue; each made script holds the Mac for the
// render time). Voice is stood in by that wait; the voice job voices the made scripts afterwards.
// Workers AI runs ONLY on the second Cloudflare account (CF2_ACCOUNT_ID + CF2_WORKERS_AI_TOKEN), with
// PBS_GEMINI_API_KEY and OPENROUTER_API_KEY. Codes only are logged: never a note or a script.
//   node worker/scripts/made-for-you-soak.mjs seed  <state dir>
//   node worker/scripts/made-for-you-soak.mjs drain <state dir> <stop at, ms since epoch>
//   node worker/scripts/made-for-you-soak.mjs summary <state dir>
//   node worker/scripts/made-for-you-soak.mjs judge-reviewed <state dir>   (the real judge on the two sessions round 5 failed)
// Env: PBS_CHAT_SOURCE = the integrated phase 3 checkout; SOAK_RENDER_SECONDS (default 360); SOAK_DUE_HOURS.
import { appendFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { build } from '../../app/node_modules/esbuild/lib/main.js';
import ts from '../../app/node_modules/typescript/lib/typescript.js';

const [mode, dir, until] = process.argv.slice(2);
if (!['seed', 'drain', 'summary', 'judge-reviewed'].includes(mode) || !dir) { console.error('usage: seed|drain|summary <state dir> [stop at]'); process.exit(2); }
mkdirSync(resolve(dir, 'jobs'), { recursive: true });
const chat = resolve(process.env.PBS_CHAT_SOURCE ?? '.phase-3');
const sqlite = new DatabaseSync(resolve(dir, 'soak.db'));
const log = event => appendFileSync(resolve(dir, 'soak.jsonl'), `${JSON.stringify({ at: Date.now(), ...event })}\n`);
const MIN = 60_000;

// The 12 notes the review asked for: 6 EN, 6 ES, both kinds, adult and teen. Made up; no real person.
const NOTES = [
  ['en', 'psalm', 0, 'Work has been heavy and I keep replaying a hard conversation from today.'],
  ['en', 'psalm', 1, 'I have a big test tomorrow and my stomach is in knots.'],
  ['en', 'psalm', 0, 'My mother is in the hospital and I feel far away from her tonight.'],
  ['en', 'imagination', 0, 'I would like to picture a quiet beach after a loud, busy week.'],
  ['en', 'imagination', 1, 'Practice ran late and my head is still buzzing. Something calm, please.'],
  ['en', 'imagination', 0, 'Snow falling outside a cabin, the kind of quiet you can hear.'],
  ['es', 'psalm', 0, 'Estoy preocupada por mi hijo, que se mudó lejos este año.'],
  ['es', 'psalm', 1, 'Mañana tengo un examen y no puedo dejar de pensar en eso.'],
  ['es', 'psalm', 0, 'El trabajo me tiene cansada y no logro descansar por las noches.'],
  ['es', 'imagination', 0, 'Quiero sentir paz en una cabaña en la montaña, lejos del ruido.'],
  ['es', 'imagination', 1, 'Hoy fue un día largo en la escuela. Quiero algo tranquilo.'],
  ['es', 'imagination', 0, 'Me gustaría imaginar un jardín tranquilo después de un día largo.'],
];

if (mode === 'summary') {
  const rows = sqlite.prepare('SELECT id, kind, lang, teen, state, attempts, retry_code, due_at, published_at FROM made_for_you ORDER BY created_at').all();
  const events = readFileSync(resolve(dir, 'soak.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
  const started = events.find(e => e.event === 'seeded')?.at;
  const made = rows.filter(r => r.state === 'ready' && r.published_at <= r.due_at);
  const per = rows.map(r => ({
    kind: r.kind, lang: r.lang, teen: !!r.teen, state: r.state, madeByPromise: r.state === 'ready' && r.published_at <= r.due_at,
    madeAfterHours: r.published_at ? +((r.published_at - started) / 3_600_000).toFixed(2) : null, failedTries: r.attempts,
    held: events.filter(e => e.event === 'held' && e.id === r.id).map(e => e.code),
    answeredBy: events.find(e => e.event === 'made' && e.id === r.id)?.rungs ?? null,
  }));
  const calls = {};
  for (const e of events.filter(e => e.event === 'call')) calls[`${e.use}:${e.rung}:${e.outcome}`] = (calls[`${e.use}:${e.rung}:${e.outcome}`] ?? 0) + 1;
  const reasons = {};
  for (const e of events.filter(e => e.event === 'reject')) reasons[e.reason] = (reasons[e.reason] ?? 0) + 1;
  const lastMade = Math.max(...made.map(r => r.published_at), started);
  const hours = (lastMade - started) / 3_600_000;
  const summary = {
    notes: rows.length, madeByPromise: made.length, en: made.filter(r => r.lang === 'en').length, es: made.filter(r => r.lang === 'es').length,
    hoursToLastMade: +hours.toFixed(2), sessionsPerHour: hours > 0 ? +(made.length / hours).toFixed(2) : null,
    // The promise: what this night proved it made by 08:00, less a 20% margin (the review's rule).
    sessionsPerNight: Math.floor(made.length * 0.8), calls, reasons, per,
  };
  writeFileSync(resolve(dir, 'summary.json'), JSON.stringify(summary, null, 1));
  for (const p of per) console.log(`${p.madeByPromise ? 'MADE' : 'NOT MADE'} ${p.lang} ${p.kind}${p.teen ? ' teen' : ''}: ${p.state}, ${p.failedTries} failed tries, held ${p.held.length}x, after ${p.madeAfterHours ?? '-'} h`);
  console.log(`OUTPUT made-for-you-soak: ${made.length}/${rows.length} made by the promise (EN ${summary.en}, ES ${summary.es}), last at ${summary.hoursToLastMade} h, sessionsPerNight ${summary.sessionsPerNight}`);
  process.exit(made.length ? 0 : 1);
}

const account = process.env.CF2_ACCOUNT_ID, token = process.env.CF2_WORKERS_AI_TOKEN;
if (['drain', 'judge-reviewed'].includes(mode) && (!account || !token || !process.env.OPENROUTER_API_KEY || !process.env.PBS_GEMINI_API_KEY)) {
  console.error('NAMED STOP MADE_FOR_YOU_SOAK_KEYS: CF2_ACCOUNT_ID, CF2_WORKERS_AI_TOKEN, PBS_GEMINI_API_KEY, OPENROUTER_API_KEY');
  process.exit(3);
}
const { config: wrangler } = ts.parseConfigFileTextToJson('wrangler.jsonc', readFileSync(resolve(chat, 'worker/wrangler.jsonc'), 'utf8'));
const bundle = await build({
  stdin: {
    contents: `export { madeForYou } from './worker/src/madeForYou.mount.ts'; export { nights, madeForYouJudge, madeForYouRungs } from './worker/src/madeForYou.ts';
      export { runLadder } from './worker/src/ladder.ts'; export { judgeSchema, judgeVerdict } from './worker/src/quality/judge.ts';
      export { realDeps } from './worker/src/index.ts';`,
    resolveDir: chat, loader: 'ts',
  },
  bundle: true, format: 'esm', platform: 'node', write: false, external: ['cloudflare:*'], logLevel: 'error',
});
const m = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

// D1 on node:sqlite (a file, so the second job of the night carries on from the first).
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

if (mode === 'seed') {
  const migrations = resolve(chat, 'worker/migrations');
  for (const file of readdirSync(migrations).filter(f => f.endsWith('.sql')).sort()) sqlite.exec(readFileSync(resolve(migrations, file), 'utf8'));
  // The Worker's Bible copy, from the app's one source (what scripts/worker-bible-load.mjs loads).
  const insert = sqlite.prepare('INSERT OR IGNORE INTO bible_verses (translation, book, chapter, verse, text) VALUES (?, ?, ?, ?, ?)');
  for (const [translation, file] of [['KJV', 'kjv'], ['RV1909', 'rv1909']]) {
    const source = new DatabaseSync(resolve('app/src/bible/data', `${file}.db`), { readOnly: true });
    sqlite.exec('BEGIN');
    for (const v of source.prepare('SELECT book, chapter, verse, text FROM verses').all()) insert.run(translation, v.book, v.chapter, v.verse, v.text);
    sqlite.exec('COMMIT');
  }
  // The promise the app would show (tonight's 08:00 CT), or SOAK_DUE_HOURS from now for a soak run in the day.
  const now = Date.now(), due = process.env.SOAK_DUE_HOURS ? now + Number(process.env.SOAK_DUE_HOURS) * 3_600_000 : m.nights(now).tonight.due;
  const add = sqlite.prepare(`INSERT INTO made_for_you (id, install_id, day, kind, lang, teen, created_at, due_at, state, note, paid_until)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?)`);
  NOTES.forEach(([lang, kind, teen, note], i) =>
    add.run(crypto.randomUUID(), crypto.randomUUID(), 'soak', kind, lang, teen, now + i, due, note, now + 30 * 86_400_000));
  log({ event: 'seeded', notes: NOTES.length, due });
  console.log(`OUTPUT made-for-you-soak: ${NOTES.length} notes queued, promised by ${new Date(due).toISOString()}`);
  process.exit(0);
}

// drain: the production claim loop until the stop time or the promise, whichever is first.
const print = console.log;
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
if (mode === 'judge-reviewed') {
  // F6: the real free judge, on the made-for-you judge's own rungs, must flag both sessions the review transcribed.
  const reviewed = JSON.parse(readFileSync('worker/test/fixtures/reviewedSessions.json', 'utf8'));
  const env0 = { ...wrangler.vars, PBS_GEMINI_API_KEY: process.env.PBS_GEMINI_API_KEY, OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY, AI, DB: db };
  let flagged = 0;
  for (const kind of ['psalm', 'imagination']) {
    const reasons = [];
    const ladder = (messages, schema, valid) => m.runLadder(db, m.madeForYouRungs(m.realDeps.rungs(env0, Date.now()), 'judge'), messages, schema, 300, new Map(), valid);
    const verdict = await m.madeForYouJudge(ladder, { schema: m.judgeSchema, verdict: m.judgeVerdict }, { kind, lang: 'en', teen: false, text: 'a long day' }, reviewed[kind], r => reasons.push(r));
    if (verdict === 'reject') flagged++;
    print(`${verdict === 'reject' ? 'FLAGGED' : verdict.toUpperCase()} reviewed ${kind}: ${reasons.join(' ') || '-'}`);
    log({ event: 'judge-reviewed', kind, verdict, reasons });
  }
  print(`OUTPUT made-for-you-judge-reviewed: ${flagged}/2 flagged by the real judge`);
  process.exit(flagged === 2 ? 0 : 1);
}
const secret = 'soak-runner';
const env = { ...wrangler.vars, PBS_GEMINI_API_KEY: process.env.PBS_GEMINI_API_KEY, OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  AI, DB: db, PBS_MADE_FOR_YOU_RUNNER_SECRET: secret, CHAT_BURST: { limit: async () => ({ success: true }) } };
let claiming = null;
const deps = {
  ...m.realDeps,
  // Every provider call is recorded by rung and outcome (draft and judge told apart by their token room).
  rungs: (e, now) => m.realDeps.rungs(e, now).map(rung => ({ ...rung, async call(messages, schema, maxTokens) {
    const use = maxTokens > 1000 ? 'draft' : 'judge';
    try { const out = await rung.call(messages, schema, maxTokens); log({ event: 'call', id: claiming, use, rung: rung.id, outcome: 'ok' }); claiming && (calls[claiming] ??= []).push(`${use}:${rung.id}`); return out; }
    catch (error) { log({ event: 'call', id: claiming, use, rung: rung.id, outcome: String(error?.message ?? error).slice(0, 40) }); throw error; }
  } })),
};
const calls = {};
const service = m.madeForYou(env, deps, async () => null, 0);
console.log = (...args) => {   // the Worker's own reject-reason lines (codes only)
  try { const line = JSON.parse(args[0]); if (line.code === 'MADE_FOR_YOU_REJECT') { log({ event: 'reject', id: claiming, reason: line.reason }); return; } } catch { /* not a code line */ }
  print(...args);
};
const runner = (path, body) => service.fetch(new Request(`https://soak.local/api/made-for-you/runner/${path}`, {
  method: 'POST', headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' }, body: JSON.stringify(body),
}));
const renderMs = Number(process.env.SOAK_RENDER_SECONDS ?? 360) * 1000;
const due = sqlite.prepare("SELECT max(due_at) AS due FROM made_for_you").get().due;
const stop = Math.min(Number(until) || Infinity, due);
const sleep = ms => new Promise(r => setTimeout(r, Math.max(0, ms)));

while (Date.now() < stop) {
  const passStarted = Date.now();
  for (;;) {
    if (Date.now() + renderMs > stop) break;
    const next = sqlite.prepare(`SELECT id FROM made_for_you WHERE state IN ('queued','scripted') AND (lease_until IS NULL OR lease_until <= ?)
      ORDER BY due_at, created_at, id LIMIT 1`).get(Date.now());
    claiming = next?.id ?? null;
    const res = await runner('claim', {});
    const body = await res.json();
    if (res.status === 503) { log({ event: 'held', id: claiming, code: body.error ?? body.code }); continue; }
    if (!res.ok) { log({ event: 'error', status: res.status, code: body.error }); break; }
    if (!body.job) break;
    const job = body.job;
    writeFileSync(resolve(dir, 'jobs', `${job.id}.json`), JSON.stringify({ ...job, lease: undefined }));
    await sleep(renderMs);   // the Mac voicing it
    sqlite.prepare(`UPDATE made_for_you SET state = 'ready', published_at = ?, note = NULL, script = NULL, lease = NULL, lease_until = NULL,
      audio_path = 'made-for-you/' || install_id || '/' || id || '.m4a', seconds = 700, sha256 = 'soak' WHERE id = ? AND state = 'scripted'`).run(Date.now(), job.id);
    log({ event: 'made', id: job.id, rungs: calls[job.id] ?? [] });
  }
  const left = sqlite.prepare("SELECT count(*) AS n FROM made_for_you WHERE state IN ('queued','scripted')").get().n;
  print(`NOTE soak pass at ${new Date(passStarted).toISOString()}: ${left} left`);
  if (!left) break;
  await sleep(Math.min(passStarted + 15 * MIN, stop) - Date.now());
}
print('OUTPUT made-for-you-soak drain finished');
