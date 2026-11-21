#!/usr/bin/env node
// One real night of Made for you on the free chain, as production runs it: the Worker's own claim endpoint
// through madeForYou.mount.ts with the chat's real rungs, ladder, checkAnswer and judge, the production caps, backoffs and leases, and the
// Mac's pass shape (a pass every 15 minutes drains the queue; each made script holds the Mac for the
// render time). Voice is stood in by that wait; the voice job voices the made scripts afterwards.
// Keys: its own only (see the NAMED STOP below). Codes only are logged: never a note or a script.
//   node worker/scripts/made-for-you-soak.mjs seed  <state dir>
//   node worker/scripts/made-for-you-soak.mjs drain <state dir> <stop at, ms since epoch>
//   node worker/scripts/made-for-you-soak.mjs summary <state dir>
//   node worker/scripts/made-for-you-soak.mjs judge-reviewed <state dir>   (the real judge on the two sessions round 5 failed)
// Env: SOAK_RENDER_SECONDS (default 360); SOAK_DUE_HOURS.
import { appendFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { soakStop } from './made-for-you-soak-stop.mjs';
import { build } from '../../app/node_modules/esbuild/lib/main.js';
import ts from '../../app/node_modules/typescript/lib/typescript.js';

const [mode, dir, until] = process.argv.slice(2);
if (!['seed', 'drain', 'summary', 'judge-reviewed'].includes(mode) || !dir) { console.error('usage: seed|drain|summary <state dir> [stop at]'); process.exit(2); }
mkdirSync(resolve(dir, 'jobs'), { recursive: true });
const chat = resolve('.');
const sqlite = new DatabaseSync(resolve(dir, 'soak.db'));
const log = event => appendFileSync(resolve(dir, 'soak.jsonl'), `${JSON.stringify({ at: Date.now(), ...event })}\n`);
const MIN = 60_000;

// The 12 notes the review asked for: 6 EN, 6 ES, both kinds, adult and teen, and one named test note. Made up; no real person.
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
  // The paid escalation's test note (SOAK_NOTES=en-escalate): it asks for Scripture read word for word, which the
  // verbatim check refuses, so a free draft is likely to need more than its one free revision.
  ['en', 'psalm', 0, 'Please read me Psalm 91 word for word tonight: He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty.', 'en-escalate'],
  // The forced-escalation note (SOAK_NOTES=en-forced with SOAK_FORCE_FREE_FAULT=en-forced): an ordinary request.
  ['en', 'psalm', 0, 'I worked a double shift and I keep thinking about the bills I still have to pay.', 'en-forced'],
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
    // Chat wins, from the soak's own counters: what it booked in chat's calls:<rung> rows (each under half of
    // chat's cap) and in its own mfy:<use>:<rung> rows, and how often a full share held a row (MFY_SHARE_USED).
    booked: Object.fromEntries(sqlite.prepare("SELECT day || ' ' || metric AS k, n FROM chat_counts WHERE metric LIKE 'calls:%' ORDER BY k").all().map(r => [r.k, r.n])),
    shareUsedHolds: events.filter(e => e.event === 'held' && e.code === 'MFY_SHARE_USED').length,
    // The private paid rung: answers per use, and its metered spend (chat's paid_spend_micro; dearest host's price).
    paidAnswers: events.filter(e => e.event === 'answered' && /:paid$/.test(e.rung)).length,
    paidSpendUsd: (sqlite.prepare("SELECT COALESCE(SUM(n), 0) AS n FROM chat_counts WHERE metric = 'paid_spend_micro'").get().n) / 1e6,
    answeredBy: events.filter(e => e.event === 'answered').reduce((acc, e) => ({ ...acc, [`${e.use}:${e.rung}`]: (acc[`${e.use}:${e.rung}`] ?? 0) + 1 }), {}),
    psalms: readdirSync(resolve(dir, 'jobs')).map(f => JSON.parse(readFileSync(resolve(dir, 'jobs', f), 'utf8'))).filter(j => j.psalm).map(j => `${j.lang} ${j.psalm}`),
  };
  writeFileSync(resolve(dir, 'summary.json'), JSON.stringify(summary, null, 1));
  // Rule 0: a soak no model answered, or one that ran without a provider family, proves nothing (named stop, exit 3).
  const stop = soakStop([...events.filter(e => e.event === 'call'), ...events.filter(e => e.event === 'answered').map(e => ({ rung: e.rung.replace(/^mfy:\w+:/, ''), outcome: 'ok' }))], process.env.SOAK_RUNGS);
  if (stop) { console.log(`NAMED STOP ${stop}`); process.exit(3); }
  for (const p of per) console.log(`${p.madeByPromise ? 'MADE' : 'NOT MADE'} ${p.lang} ${p.kind}${p.teen ? ' teen' : ''}: ${p.state}, ${p.failedTries} failed tries, held ${p.held.length}x, after ${p.madeAfterHours ?? '-'} h`);
  console.log(`OUTPUT made-for-you-soak: ${made.length}/${rows.length} made by the promise (EN ${summary.en}, ES ${summary.es}), last at ${summary.hoursToLastMade} h, sessionsPerNight ${summary.sessionsPerNight}, share holds ${summary.shareUsedHolds}, psalms ${summary.psalms.join(', ') || '-'}`);
  console.log(`booked ${JSON.stringify(summary.booked)}`);
  // Which model's drafts meet the bar (MADE_FOR_YOU_DRAFT_CHECK, from the logged events of every pass): config.rungOrder
  // is ordered by this.
  const draftChecks = {};
  for (const e of events.filter(e => e.event === 'draft_check')) {
    const r = (draftChecks[e.rung] ??= { drafts: 0, first: 0, passed: 0 }); r.drafts++; if (e.round === 0) r.first++; if (e.pass) r.passed++;
  }
  console.log(`OUTPUT made-for-you-soak draft pass rate by rung: ${Object.entries(draftChecks).map(([rung, r]) => `${rung} ${r.passed}/${r.drafts} (${r.first} first drafts)`).join('; ') || 'no drafts checked'}`);
  console.log(`OUTPUT made-for-you-soak paid rung: ${summary.paidAnswers} answers, $${summary.paidSpendUsd.toFixed(4)} metered${made.length ? `, $${(summary.paidSpendUsd / made.length).toFixed(4)} per made session` : ''}; answered by ${JSON.stringify(summary.answeredBy)}; reject reasons ${JSON.stringify(reasons)}`);
  process.exit(made.length ? 0 : 1);
}

// Keys (coordinator ruling, 21 Nov 2026, PHASES.md "CHAT WINS" amended): the red team's PBS_RT_* keys, never
// production's PBS_GEMINI_API_KEY / OPENROUTER_API_KEY (the vault holds only those, so a local run cannot pick
// them up by mistake). Every call is booked under half of chat's cap (madeForYouRungs) and stops at MFY_SHARE_USED;
// the night soak starts only after the chat red team has finished (com.seq.pbs-mfy-soak-once).
// SOAK_RUNGS (optional) keeps only rungs whose id starts with one of its comma-separated prefixes: a daytime check
// runs on Workers AI and OpenRouter only, whose UTC days reset before the 18:10 CT red team, never on Gemini's.
const account = process.env.PBS_RT_CF_ACCOUNT, token = process.env.PBS_RT_CF_TOKEN;
// The free Gemini key is PBS_RT_GEMINI_FREE (the red team's twin of production's PBS_FREE_GEMINI_API_KEY, the name
// phase 3's free rung reads). The soak read the old PBS_RT_GEMINI into PBS_GEMINI_API_KEY, which the free rung no longer
// reads, so every Gemini rung threw PBS_FREE_GEMINI_API_KEY_MISSING and the soak ran without Gemini (review of #69).
// OpenRouter: one key for the free rung (max_price 0) and the private paid rung (zdr, US hosts), as in production
// (OPENROUTER_API_KEY); the red team's paid-enabled twin is PBS_RT_OPENROUTER_PAID.
export const SOAK_KEYS = ['PBS_RT_CF_ACCOUNT', 'PBS_RT_CF_TOKEN', 'PBS_RT_GEMINI_FREE', 'PBS_RT_OPENROUTER_PAID'];
const soakGemini = process.env.PBS_RT_GEMINI_FREE, soakOpenRouter = process.env.PBS_RT_OPENROUTER_PAID;
if (['drain', 'judge-reviewed'].includes(mode) && SOAK_KEYS.some(key => !process.env[key])) {
  console.error(`NAMED STOP MADE_FOR_YOU_SOAK_KEYS: ${SOAK_KEYS.filter(key => !process.env[key]).join(', ')} missing (the red team's keys, never production's)`);
  process.exit(3);
}
const allowed = (process.env.SOAK_RUNGS ?? '').split(',').map(x => x.trim()).filter(Boolean);
const keep = rungs => allowed.length ? rungs.filter(r => allowed.some(prefix => r.id.startsWith(prefix))) : rungs;
const { config: wrangler } = ts.parseConfigFileTextToJson('wrangler.jsonc', readFileSync(resolve(chat, 'worker/wrangler.jsonc'), 'utf8'));
const bundle = await build({
  stdin: {
    contents: `export { madeForYou, chatShare } from './worker/src/madeForYou.mount.ts'; export { nights, madeForYouJudge, madeForYouRungs, bibleRunRows } from './worker/src/madeForYou.ts';
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
    const verses = source.prepare('SELECT book, chapter, verse, text FROM verses').all();
    for (const v of verses) insert.run(translation, v.book, v.chapter, v.verse, v.text);
    // The Scripture index, as worker/scripts/made-for-you-bible-runs.mjs loads it into D1.
    const run = sqlite.prepare('INSERT OR IGNORE INTO bible_runs (translation, h, book, chapter, verse) VALUES (?, ?, ?, ?, ?)');
    for (const [h, r] of m.bibleRunRows(translation, verses)) run.run(translation, h, r.book, r.chapter, r.verse);
    sqlite.exec('COMMIT');
  }
  // The promise the app would show (tonight's 08:00 CT), or SOAK_DUE_HOURS from now for a soak run in the day.
  const now = Date.now(), due = process.env.SOAK_DUE_HOURS ? now + Number(process.env.SOAK_DUE_HOURS) * 3_600_000 : m.nights(now).tonight.due;
  const add = sqlite.prepare(`INSERT INTO made_for_you (id, install_id, day, kind, lang, teen, created_at, due_at, state, note, paid_until)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?)`);
  // One listener per language and kind, on successive nights (one request a night), so her psalm sessions turn
  // through the comfort psalms (23, 4, 121).
  // SOAK_NOTES (optional, e.g. "en-psalm") seeds only those notes.
  const only = (process.env.SOAK_NOTES ?? '').split(',').filter(Boolean), installs = {};
  const tag = ([lang, kind, , , named]) => named ?? `${lang}-${kind}`;
  // SOAK_FORCE_FREE_FAULT (a note tag, test only): that note's free drafts and free revisions keep one fixable fault
  // (an AI word added to the model's first paragraph), so its one free revision fails and the paid rung must revise.
  const forced = [];
  NOTES.filter(n => only.length ? only.includes(tag(n)) : !n[4]).forEach((n, i) => {
    const [lang, kind, teen, note, named] = n, id = crypto.randomUUID();
    add.run(id, installs[named ?? `${lang}-${kind}`] ??= crypto.randomUUID(), `soak-${i}`, kind, lang, teen, now + i, due, note, now + 30 * 86_400_000);
    if (process.env.SOAK_FORCE_FREE_FAULT && tag(n) === process.env.SOAK_FORCE_FREE_FAULT) forced.push(id);
  });
  writeFileSync(resolve(dir, 'forced.json'), JSON.stringify(forced));
  if (forced.length) console.log(`OUTPUT made-for-you-soak: free drafts forced to keep a fault on ${forced.map(id => id.slice(0, 8)).join(', ')} (${process.env.SOAK_FORCE_FREE_FAULT})`);
  const seeded = sqlite.prepare('SELECT count(*) AS n FROM made_for_you').get().n;
  log({ event: 'seeded', notes: seeded, due });
  console.log(`OUTPUT made-for-you-soak: ${seeded} notes queued, promised by ${new Date(due).toISOString()}`);
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
  const env0 = { ...wrangler.vars, PBS_FREE_GEMINI_API_KEY: soakGemini, OPENROUTER_API_KEY: soakOpenRouter, AI, DB: db };
  // The two sessions the round-5 review failed, and a made session the gate passed with two slips, one per copy.
  const kjv23 = sqlite.prepare("SELECT text FROM bible_verses WHERE translation = 'KJV' AND book = 'PSA' AND chapter = 23 ORDER BY verse").all().map(r => r.text);
  const cases = [['psalm', 'psalm'], ['imagination', 'imagination'], ['oddPalms', 'imagination'], ['oddMoments', 'imagination']];
  let flagged = 0;
  for (const [name, kind] of cases) {
    const reasons = [];
    // Each rung's outcome is logged, so a DOWN says why (a quota, a bad answer, a timeout).
    const rungs = keep(m.realDeps.rungs(env0, Date.now())).map(rung => ({ ...rung, async call(...a) {
      try { const out = await rung.call(...a); log({ event: 'call', name, use: 'judge', rung: rung.id, outcome: 'ok' }); return out; }
      catch (error) { const outcome = String(error?.code ?? error?.message ?? error).slice(0, 60); reasons.push(`${rung.id}:${outcome}`); log({ event: 'call', name, use: 'judge', rung: rung.id, outcome }); throw error; }
    } }));
    const answers = [];
    const ladder = (messages, schema, valid) => m.runLadder(db, m.madeForYouRungs(rungs, 'judge', m.chatShare(db)), messages, schema, JSON.parse(readFileSync('worker/src/madeForYou.config.json', 'utf8')).judgeMaxTokens, new Map(),
      value => { const ok = valid(value); if (!ok) answers.push(JSON.stringify(value).slice(0, 300)); return ok; });
    const input = { kind, lang: 'en', teen: false, text: 'a long day', ...(kind === 'psalm' ? { verses: kjv23 } : {}) };
    const verdict = await m.madeForYouJudge(ladder, { schema: m.judgeSchema, verdict: m.judgeVerdict }, input, reviewed[name], r => reasons.push(r));
    if (verdict === 'reject') flagged++;
    print(`${verdict === 'reject' ? 'FLAGGED' : verdict.toUpperCase()} ${name}: ${reasons.join(' ') || '-'}${answers.length ? ` (refused answers: ${answers.join(' | ')})` : ''}`);
    log({ event: 'judge-reviewed', name, verdict, reasons });
  }
  print(`OUTPUT made-for-you-judge-reviewed: ${flagged}/${cases.length} flagged by the real judge`);
  process.exit(flagged === cases.length ? 0 : 1);
}
const secret = 'soak-runner';
const env = { ...wrangler.vars, PBS_FREE_GEMINI_API_KEY: soakGemini, OPENROUTER_API_KEY: soakOpenRouter,
  AI, DB: db, PBS_MADE_FOR_YOU_RUNNER_SECRET: secret, CHAT_BURST: { limit: async () => ({ success: true }) } };
let claiming = null;
const deps = {
  ...m.realDeps,
  // Every provider call is recorded by rung and outcome (draft and judge told apart by their token room).
  // The per-call timeout and usage meter are passed through (made for you's 90 s, config.callTimeoutMs).
  rungs: (e, now) => keep(m.realDeps.rungs(e, now)).map(rung => ({ ...rung, async call(messages, schema, maxTokens, ...rest) {
    const use = maxTokens > 1000 ? 'draft' : 'judge';
    try { const out = await rung.call(messages, schema, maxTokens, ...rest); log({ event: 'call', id: claiming, use, rung: rung.id, outcome: 'ok' });
 claiming && (calls[claiming] ??= []).push(`${use}:${rung.id}`);
      // SOAK_FORCE_FREE_FAULT: this free answer keeps a fault the checks name (see seed).
      if (use === 'draft' && forcedIds.has(claiming) && Array.isArray(out?.paragraphs) && out.paragraphs.length) {
        log({ event: 'forced_fault', id: claiming, rung: rung.id });
        return { ...out, paragraphs: [`${out.paragraphs[0]} A profound calm fills the room.`, ...out.paragraphs.slice(1)] };
      }
      return out; }
    catch (error) { log({ event: 'call', id: claiming, use, rung: rung.id, outcome: String(error?.message ?? error).slice(0, 40) }); throw error; }
  } })),
};
const calls = {};
const forcedIds = new Set((() => { try { return JSON.parse(readFileSync(resolve(dir, 'forced.json'), 'utf8')); } catch { return []; } })());
const service = m.madeForYou(env, deps, async () => null, 0);
const reasons = {}, answeredBy = {};
console.log = (...args) => {   // the Worker's own code lines: reject reasons and the rung that answered (codes only)
  try {
    const line = JSON.parse(args[0]);
    if (line.code === 'MADE_FOR_YOU_REJECT') { log({ event: 'reject', id: claiming, reason: line.reason }); (reasons[claiming] ??= []).push(line.reason); return; }
    if (line.code === 'MADE_FOR_YOU_DRAFT_CHECK') { log({ event: 'draft_check', id: claiming, rung: line.rung, round: line.round, pass: line.pass }); return; }
    if (line.code === 'MADE_FOR_YOU_RUNG') { log({ event: 'answered', id: claiming, use: line.use, rung: line.rung }); (answeredBy[claiming] ??= []).push(`${line.use}:${line.rung}`); return; }
  } catch { /* not a code line */ }
  print(...args);
};
// The live log (she watches it): one line per session the moment it is made or held. Codes, the rung, the length and
// the first 300 characters of the SCRIPT only; never her note (the soak's notes are made up, and none is a crisis).
const short = id => String(id ?? '-').slice(0, 8);
const rowOf = id => sqlite.prepare('SELECT lang, kind, state, attempts FROM made_for_you WHERE id = ?').get(id) ?? {};
const spokenMinutes = text => (text.split(/\s+/).filter(Boolean).length / 105).toFixed(1);
const live = (id, outcome, extra) => print(`SESSION ${short(id)} ${rowOf(id).lang ?? '?'} ${rowOf(id).kind ?? '?'} ${outcome} | ${extra}`);
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
    if (res.status === 503) {
      log({ event: 'held', id: claiming, code: body.error ?? body.code });
      live(claiming, body.error === 'MADE_FOR_YOU_ATTEMPTS_EXHAUSTED' ? 'FAILED' : 'HELD', `${body.error ?? body.code}; reasons ${(reasons[claiming] ?? []).join(', ') || '-'}; tries ${rowOf(claiming).attempts ?? '-'}; rungs ${(answeredBy[claiming] ?? []).join(', ') || 'none answered'}`);
      reasons[claiming] = []; answeredBy[claiming] = [];
      continue;
    }
    if (!res.ok) { log({ event: 'error', status: res.status, code: body.error }); break; }
    if (!body.job) break;
    const job = body.job;
    writeFileSync(resolve(dir, 'jobs', `${job.id}.json`), JSON.stringify({ ...job, lease: undefined }));
    const drafted = (answeredBy[job.id] ?? []).filter(r => r.startsWith('draft:')).at(-1) ?? '?';
    live(job.id, 'MADE', `drafted by ${drafted.replace(/^draft:/, '')}; ${(answeredBy[job.id] ?? []).length} answers; rejected before: ${(reasons[job.id] ?? []).join(', ') || '-'}; ~${spokenMinutes(`${job.reflection} ${job.closing ?? ''}`)} min of prose${job.psalm ? ` + Psalm ${job.psalm}` : ''} (voiced length in the voice job); middle: ${JSON.stringify(job.reflection.split('\n\n').slice(4).join(' ').slice(0, 300))}`);
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
