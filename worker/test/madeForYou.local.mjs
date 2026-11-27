// Run from the repository root: node --test worker/test/madeForYou.unit.mjs worker/test/madeForYou.local.mjs
//   node --test worker/test/madeForYou.local.mjs
// One local Worker (Miniflare, D1 with phase 3's migrations then 0006, R2) bound to phase 3's real
// ladder, checkAnswer, judge and report code; the real Mac runner (audio/made_for_you.py) with a stub voice.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { promisify } from 'node:util';
import { build } from '../../app/node_modules/esbuild/lib/main.js';
import ts from '../../app/node_modules/typescript/lib/typescript.js';
import * as miniflare from 'miniflare';

const id = {
  owner: '10000000-0000-4000-a000-000000000001', other: '10000000-0000-4000-a000-000000000002',
  free: '10000000-0000-4000-a000-000000000003', limited: '10000000-0000-4000-a000-000000000004',
  lapsed: '10000000-0000-4000-a000-000000000005',
};
const secret = 'local-runner';
const DAY = 86_400_000;
const MIN = 60_000;
// Tuesday 17 Nov 2026, 10:00 Central: tonight's night ends Wednesday 08:00 Central (14:00 UTC).
const at = Date.parse('2026-11-17T16:00:00Z');
const tonight = Date.parse('2026-11-18T14:00:00Z');
const tomorrow = Date.parse('2026-11-19T14:00:00Z');
const python = promisify(execFile);
const chat = resolve('.');
const { config } = ts.parseConfigFileTextToJson('wrangler.jsonc', readFileSync(resolve(chat, 'worker/wrangler.jsonc'), 'utf8'));
const mfyConfig = JSON.parse(readFileSync('worker/src/madeForYou.config.json', 'utf8'));
// Every free rung made for you uses (config.rungOrder), as chat_counts metrics.
const freeMetrics = mfyConfig.rungOrder.map(id => `calls:${id}`);
const strongest = mfyConfig.rungOrder[0];
const lane = await build({ entryPoints: ['worker/src/madeForYou.ts'], bundle: true, format: 'esm', platform: 'node', write: false, logLevel: 'error' })
  .then(out => import(`data:text/javascript;base64,${Buffer.from(out.outputFiles[0].text).toString('base64')}`));

async function worker(t) {
  const bundle = await build({
    entryPoints: ['worker/test/madeForYou.stub.ts'], bundle: true, format: 'esm', write: false,
    plugins: [{
      name: 'chat-config',
      setup(b) {
        b.onResolve({ filter: /^chat-vars$/ }, () => ({ path: 'chat-config', namespace: 'fixture' }));
        b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: JSON.stringify(config.vars), loader: 'json' }));
      },
    }],
  });
  const options = { modules: true, script: bundle.outputFiles[0].text, compatibilityDate: '2026-11-20', d1Databases: ['DB'], r2Buckets: ['AUDIO'] };
  const mf = new miniflare.Miniflare(miniflare.convertV4MiniflareOptions?.(options) ?? options);
  t.after(() => mf.dispose());
  const url = await mf.ready;
  const db = await mf.getD1Database('DB');
  const migrations = [
    ...readdirSync(resolve(chat, 'worker/migrations')).sort().map(f => readFileSync(resolve(chat, 'worker/migrations', f), 'utf8')),
  ];
  // One statement per prepare(); a trigger's BEGIN..END body stays whole.
  for (const sql of migrations) {
    let statement = '';
    let inTrigger = false;
    for (const line of sql.split('\n')) {
      if (/^\s*--/.test(line) || !line.trim()) continue;
      statement += line + '\n';
      if (/\bBEGIN\s*$/.test(line)) inTrigger = true;
      if (inTrigger ? /^\s*END;\s*$/.test(line) : /;\s*(--.*)?$/.test(line)) {
        await db.prepare(statement).run();
        statement = '';
        inTrigger = false;
      }
    }
  }
  for (const [translation, file] of [['KJV', 'kjv'], ['RV1909', 'rv1909']]) {
    const source = new DatabaseSync(`app/src/bible/data/${file}.db`, { readOnly: true });
    // The comfort psalms a session can end in (PSALMS in madeForYou.ts), as the Worker's bible_verses holds them.
    const verses = source.prepare("SELECT chapter, verse, text FROM verses WHERE book = 'PSA' AND chapter IN (4, 23, 91, 121, 131, 139) ORDER BY chapter, verse").all();
    source.close();
    assert.equal(verses.filter(v => v.chapter === 23).length, 6);
    await db.batch(verses.map(v => db.prepare("INSERT INTO bible_verses VALUES (?, 'PSA', ?, ?, ?)").bind(translation, v.chapter, v.verse, v.text)));
    // The Scripture index over the same verses (made-for-you-bible-runs.mjs loads the whole Bible in production).
    const runs = [...lane.bibleRunRows(translation, verses.map(v => ({ ...v, book: 'PSA' })))];
    for (let i = 0; i < runs.length; i += 50) await db.batch(runs.slice(i, i + 50).map(([h, r]) => db.prepare('INSERT INTO bible_runs VALUES (?, ?, ?, ?, ?)').bind(translation, h, r.book, r.chapter, r.verse)));
  }
  const call = (token, { now = at, params = '?kind=psalm&lang=es', path = '', body, method, headers = {} } = {}) =>
    fetch(new URL(path.startsWith('/api') ? path : '/api/made-for-you' + path + (path ? '' : params), url), {
      method: method ?? (body === undefined ? 'GET' : 'POST'),
      headers: { authorization: `Bearer ${token}`, 'x-test-now': String(now), 'content-type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  // Claims run with the paid rung left out (as at the monthly cap) unless a test asks for it: the free-only holds
  // stay proven; the paid fallback has its own test below.
  const claim = (now, headers) => call(secret, { now, path: '/runner/claim', body: {}, headers: { 'x-test-paid': 'off', ...headers } });
  const row = rowId => db.prepare('SELECT * FROM made_for_you WHERE id = ?').bind(rowId).first();
  return { url, db, call, claim, row, mf };
}

const note = { kind: 'psalm', door: 'faith', lang: 'es', text: 'Días de lluvia' };
const scene = { kind: 'imagination', door: 'mindset', lang: 'en', text: 'Rain at the window' };

test('requests are paid-only, crisis-checked first, one a day, and promised a real time from the night’s capacity', async t => {
  const { db, call } = await worker(t);
  const count = async () => (await db.prepare('SELECT count(*) AS n FROM made_for_you').first()).n;
  assert.equal((await call(id.free, { body: note })).status, 403);
  assert.equal((await call(id.free)).status, 403);
  assert.equal((await call('invalid', { body: note })).status, 401);
  assert.equal((await call(id.limited, { body: note })).status, 429);
  for (const text of ['fixture floor', 'fixture model']) {
    assert.deepEqual(await (await call(id.owner, { body: { ...note, text } })).json(), { status: 'crisis', kind: text, text: 'Fixed safety reply' });
  }
  // A Korean or Chinese screen gets the crisis lines in its own language (the session itself stays English or Spanish);
  // a language the app does not have falls back to the session's, never an error that hides the lines.
  for (const shown of ['ko', 'zh-Hans', 'zh-Hant'])
    assert.equal((await (await call(id.owner, { body: { ...note, text: 'fixture floor', shown } })).json()).text, `Fixed safety reply (${shown})`, shown);
  assert.equal((await (await call(id.owner, { body: { ...note, text: 'fixture floor', shown: 'fr' } })).json()).text, 'Fixed safety reply');
  assert.equal((await call(id.owner, { body: { ...note, text: 'fixture unavailable' } })).status, 503);
  assert.equal((await call(id.owner, { body: { ...note, door: 'mindset' } })).status, 400);
  assert.equal((await call(id.owner, { body: { ...note, text: 'a'.repeat(501) } })).status, 400);
  assert.equal(await count(), 0, 'nothing is stored before the crisis and shape checks pass');

  const before = await (await call(id.owner)).json();
  assert.deepEqual(before, { pending: null, ended: null, requestedToday: false, next: tonight, ready: [] });
  const sent = await call(id.owner, { body: note });
  assert.equal(sent.status, 202);
  const receipt = await sent.json();
  assert.equal(receipt.dueAt, tonight);
  const after = await (await call(id.owner)).json();
  assert.deepEqual(after.pending, { id: receipt.id, day: receipt.day, dueAt: tonight, late: false, retrying: false });
  assert.equal(after.requestedToday, true, 'the form hides once today’s request is used');
  assert.equal((await call(id.owner, { body: scene })).status, 429);
  assert.equal((await (await call(id.owner, { params: '?kind=imagination&lang=en' })).json()).requestedToday, true);
  const race = await Promise.all([call(id.other, { body: note }), call(id.other, { body: note })]);
  assert.deepEqual(race.map(r => r.status).sort(), [202, 429]);

  // Fill tonight: the next request is honestly promised for tomorrow night, then nothing is taken.
  const seat = (n, due) => db.batch(Array.from({ length: n }, (_, i) => db.prepare(`INSERT INTO made_for_you
    (id, install_id, day, kind, lang, teen, created_at, due_at, state, note) VALUES (?, ?, '2026-11-17', 'psalm', 'es', 0, ?, ?, 'queued', 'x')`)
    .bind(crypto.randomUUID(), crypto.randomUUID(), at, due)));
  await seat(mfyConfig.sessionsPerNight - 2, tonight);
  const third = await call(crypto.randomUUID(), { body: note });
  assert.equal((await third.json()).dueAt, tomorrow, 'tonight is full, so tomorrow night is promised');
  await seat(mfyConfig.sessionsPerNight - 1, tomorrow);
  const shelf = await (await call(crypto.randomUUID())).json();
  assert.equal(shelf.next, null, 'the form knows before she writes that both nights are full');
  const queued = await count();
  const full = await call(crypto.randomUUID(), { body: note });
  assert.equal(full.status, 409);
  assert.deepEqual(await full.json(), { error: 'FULL' });
  assert.equal(await count(), queued, 'a request that cannot be made is never stored');
  const status = await (await call(secret, { path: '/runner/status', body: {} })).json();
  assert.equal(status.refusedFull, 1, 'demand over capacity is counted, with no identifier');
});

test('the runner drafts on the shared ladder with its own budget, erases the note at once, and stops on the third failure', async t => {
  const { db, call, claim, row } = await worker(t);
  const chatCounters = async () => (await db.prepare("SELECT * FROM chat_counts WHERE metric NOT LIKE 'calls:mfy:%' ORDER BY day, metric").all()).results;
  // Chat wins: chat's own row for a rung grows by exactly the made-for-you calls on it, and nothing else moves.
  const sharedRight = async () => {
    const rows = (await db.prepare("SELECT day, metric, n FROM chat_counts").all()).results;
    const mfy = {};
    for (const r of rows.filter(r => r.metric.startsWith('calls:mfy:'))) {
      const rung = r.metric.replace(/^calls:mfy:(draft|judge):/, 'calls:');
      mfy[`${r.day} ${rung}`] = (mfy[`${r.day} ${rung}`] ?? 0) + r.n;
    }
    const was = Object.fromEntries(before.map(r => [`${r.day} ${r.metric}`, r.n]));
    const now = Object.fromEntries(rows.filter(r => !r.metric.startsWith('calls:mfy:')).map(r => [`${r.day} ${r.metric}`, r.n]));
    // The paid rung is not on chat's free books (its spend is on the paid meter, checked in the paid tests).
    for (const key of new Set([...Object.keys(was), ...Object.keys(now)].filter(k => !/ (paid_spend_micro|calls:paid)$/.test(k)))) assert.equal(now[key] ?? 0, (was[key] ?? 0) + (mfy[key] ?? 0), key);
  };
  await db.prepare("INSERT INTO chat_counts (day, metric, n) VALUES ('2026-11-17', 'calls:workers-ai', 1)").run();
  const before = await chatCounters();
  assert.equal((await call(id.owner, { path: '/runner/claim', body: {} })).status, 401);

  // The strongest free model first (config.rungOrder, not chat's cheapest-first order): it drafts. That draft
  // leaned on an AI word and had a short paragraph: it went back once with exactly those faults.
  const first = (await (await call(id.owner, { body: note })).json()).id;
  const claimed = await claim(at, { 'x-test-draft': 'flawed' });
  const revised = JSON.parse(decodeURIComponent(claimed.headers.get('x-test-revisions') ?? '[]'));
  assert.equal(revised.length, 1, 'one revision, not a fresh draft');
  assert.match(revised[0], /Paragraph 3 has \d+ words/);
  assert.match(revised[0], /profound/);
  assert.ok(!revised[0].includes('Días de lluvia'), 'her note is never quoted back as a fault');
  const one = await claimed.json();
  assert.equal(one.job.id, first);
  // The strongest model wrote the draft and its one free revision, which rewrote only the faulted paragraph;
  // Workers AI (last) was never asked.
  const written = one.job.reflection.split('\n\n').slice(4);
  assert.match(written[2], new RegExp(`This draft came from ${strongest}\\.$`));
  assert.ok(written.every((p, i) => i === 2 || !p.includes('This draft came from')), 'only paragraph 3 was rewritten');
  assert.equal((await db.prepare("SELECT n FROM chat_counts WHERE metric = ?").bind(`calls:mfy:draft:${strongest}`).first()).n, 2);
  assert.equal(await db.prepare("SELECT n FROM chat_counts WHERE metric = 'calls:mfy:draft:workers-ai' AND n > 0").first(), null);
  // Her first psalm session ends in Psalm 23, read whole from the store; her next ones go on through the comfort psalms.
  assert.equal(one.job.psalm, 23);
  assert.equal(one.job.verses.length, 6);
  const scripted = await row(first);
  assert.equal(scripted.state, 'scripted');
  assert.equal(scripted.note, null, 'her note is erased as soon as an approved script exists');
  // Gemini is next in chat's order, on made-for-you's own share; OpenRouter is not touched while Gemini answers.
  const second = (await (await call(id.other, { body: note })).json()).id;
  const two = await (await claim(at)).json();
  assert.equal(two.job.id, second, 'a leased row is skipped');
  assert.match(two.job.reflection, /This draft came from gemini-free:\S+\./);
  assert.equal(await db.prepare("SELECT n FROM chat_counts WHERE metric LIKE 'calls:mfy:draft:openrouter%' AND n > 0").first(), null);
  await sharedRight();

  // A dry chain is a held retry she can see; her note stays for the retry.
  const third = '20000000-0000-4000-a000-000000000001';
  const sceneInstall = '10000000-0000-4000-a000-000000000009';
  await db.prepare(`INSERT INTO made_for_you (id, install_id, day, kind, lang, teen, created_at, due_at, state, note)
    VALUES (?, ?, '2026-11-17', 'imagination', 'en', 0, ?, ?, 'queued', 'Rain at the window')`).bind(third, sceneInstall, at - MIN, tonight).run();
  const dry = await claim(at, { 'x-test-models-down': 'gemini-free,openrouter-free' });
  assert.equal(dry.status, 503);
  assert.deepEqual(await dry.json(), { error: 'MADE_FOR_YOU_NO_FREE_MODEL' });
  let held = await row(third);
  assert.equal(held.note, 'Rain at the window');
  assert.equal(held.attempts, 0);
  assert.equal((await (await call(sceneInstall, { params: '?kind=imagination&lang=en' })).json()).pending.retrying, true, 'she sees we will try again');
  assert.deepEqual(await (await claim(at + MIN)).json(), { job: null }, 'an outage backs the row off; the rest of the queue is not blocked');
  assert.equal((await claim(at + 16 * MIN, { 'x-test-judge': 'down' })).status, 503);
  assert.equal((await row(third)).attempts, 0, 'a judge outage is a retry, not a failure');
  // Three rejected drafts, each tried again only after a 5-minute step back (never a burst): stopped,
  // and her note is gone in the same update. The redrafts after the first failure are the paid rung's (config.escalate).
  for (let i = 0; i < 3; i++) {
    const rejected = await claim(at + (32 + 6 * i) * MIN, { 'x-test-judge': 'fail', 'x-test-paid': 'on' });
    assert.deepEqual(await rejected.json(), { error: i === 2 ? 'MADE_FOR_YOU_ATTEMPTS_EXHAUSTED' : 'MADE_FOR_YOU_DRAFT' });
    if (i === 0) assert.notEqual((await (await claim(at + 33 * MIN, { 'x-test-judge': 'fail' })).json()).job?.id ?? null, third, 'a rejected draft does not retry at once');
  }
  held = await row(third);
  assert.equal(held.state, 'stopped');
  assert.equal(held.note, null);
  assert.equal(held.script, null);
  await sharedRight();
  // A request we failed does not use up her day.
  const sceneShelf = await (await call(sceneInstall, { now: at + 50 * MIN, params: '?kind=imagination&lang=en' })).json();
  assert.equal(sceneShelf.ended, 'stopped');
  assert.equal(sceneShelf.requestedToday, false);
  assert.equal((await call(sceneInstall, { now: at + 50 * MIN, body: scene })).status, 202);
  assert.equal((await call(sceneInstall, { now: at + 51 * MIN, body: scene })).status, 429, 'still one a day');
});

test('chat wins: made-for-you books a rung only up to half of chat\'s cap, is refused past it, and chat still gets the rung', async t => {
  const { db, call, claim } = await worker(t);
  const rung = strongest;
  const { cap, day } = { cap: 200, day: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(at) };
  const row = () => db.prepare('SELECT n FROM chat_counts WHERE day = ? AND metric = ?').bind(day, `calls:${rung}`).first().then(r => r?.n ?? 0);
  // Chat has used 98 of its 200 Gemini calls today; chat has used half or more of every other rung.
  await db.prepare('INSERT INTO chat_counts (day, metric, n) VALUES (?, ?, 98)').bind(day, `calls:${rung}`).run();
  for (const other of freeMetrics.filter(m => m.startsWith('calls:gemini-free:') && m !== `calls:${rung}`)) {
    await db.prepare('INSERT INTO chat_counts (day, metric, n) VALUES (?, ?, 200)').bind(day, other).run();
  }
  await db.prepare("INSERT INTO chat_counts (day, metric, n) VALUES (?, 'calls:workers-ai', 10), (?, 'calls:openrouter-free', 450)")
    .bind(new Date(at).toISOString().slice(0, 10), new Date(at).toISOString().slice(0, 10)).run();
  await call(id.owner, { body: note });
  await call(id.other, { body: note });
  const one = await claim(at);
  assert.ok((await one.json()).job, 'a draft and a judgment fit under half: made-for-you gets them');
  assert.equal(await row(), 100);
  const two = await claim(at);
  assert.equal(two.status, 503);
  assert.deepEqual(await two.json(), { error: 'MFY_SHARE_USED' }, 'past half it is a named, retried stop, never a call');
  assert.equal(await row(), 100, 'the refused call was not made');
  // Chat's own ladder still books the rung (phase 3 counts.reserve with chat's full cap).
  const chat = await db.prepare('INSERT INTO chat_counts (day, metric, n) VALUES (?, ?, 1) ON CONFLICT(day, metric) DO UPDATE SET n = n + 1 WHERE n < ? RETURNING n')
    .bind(day, `calls:${rung}`, cap).first();
  assert.equal(chat.n, 101);
});

test('the Mac publishes, she plays, reports (one report path) and deletes; the cron keeps every retention promise', async t => {
  const { db, call, claim, row, url } = await worker(t);
  const job = (await (await call(id.owner, { body: note })).json()).id;
  const runner = `
import hashlib, json, sys
from urllib.request import Request, urlopen
sys.path.insert(0, 'audio')
from made_for_you import make_request, process_one
base, secret = sys.argv[1:]
def voice(item, work):
    assert item['text'] == 'RV1909' and len(item['verses']) > 6
    out = work / 'session.m4a'
    out.write_bytes(b'stub-voice')
    return dict(status='passed', seconds=680, sha256=hashlib.sha256(out.read_bytes()).hexdigest(), _local=str(out))
def put(item, file):
    with urlopen(Request(base + '/_test-media/' + item['file'], data=file.read_bytes(), headers={'Authorization': 'Bearer ' + secret}, method='PUT')) as r:
        assert r.status == 204
assert process_one(make_request(base + '/api', secret), voice, put, lambda item: None)
`;
  await python('python3', ['-c', runner, url.origin, secret]);
  const ready = await row(job);
  assert.equal(ready.state, 'ready');
  assert.equal(ready.note, null);
  assert.equal(ready.script, null);
  const shelf = await (await call(id.owner, { now: Date.now() })).json();
  assert.equal(shelf.ready[0].id, job);
  assert.equal(shelf.pending, null);
  assert.equal((await call(id.other, { now: Date.now(), params: `?kind=psalm&lang=es&play=${job}` })).status, 404);
  const playback = await (await call(id.owner, { now: Date.now(), params: `?kind=psalm&lang=es&play=${job}` })).json();
  assert.equal((await fetch(new URL('/_test-media/' + ready.audio_path, url))).status, 403);
  assert.equal(await (await fetch(playback.url)).text(), 'stub-voice');
  const unset = await call(id.owner, { now: Date.now(), params: `?kind=psalm&lang=es&play=${job}`, headers: { 'x-test-storage': 'unset' } });
  assert.equal(unset.status, 503);
  assert.deepEqual(await unset.json(), { error: 'MADE_FOR_YOU_STORAGE_CONFIG' });

  // Report: another install cannot; she can; a person gets the audio and the reason, never her install id.
  const report = (token, body) => call(token, { now: Date.now(), path: '/api/report', body });
  assert.equal((await report(id.other, { session: job, reason: 'unsafe' })).status, 404);
  assert.equal((await report(id.owner, { session: job, reason: 'spam' })).status, 400);
  assert.deepEqual(await (await report(id.owner, { session: job, reason: 'unsafe' })).json(), { reported: true });
  const kept = await db.prepare('SELECT * FROM made_for_you_report').all();
  assert.equal(kept.results.length, 1);
  assert.deepEqual(Object.keys(kept.results[0]).sort(), ['at', 'audio_key', 'kind', 'lang', 'reason']);
  assert.ok(!JSON.stringify(kept.results).includes(id.owner));
  assert.equal(await (await fetch(new URL(`/_test-media/${kept.results[0].audio_key}?ticket=local-only`, url))).text(), 'stub-voice');
  assert.equal((await fetch(new URL(`/_test-media/${ready.audio_path}?ticket=local-only`, url))).status, 404, 'her copy is gone');
  assert.deepEqual((await (await call(id.owner, { now: Date.now() })).json()).ready, [], 'a reported session leaves her shelf');
  // The chat's own answer reports still go through the same route.
  assert.deepEqual(await (await report(id.owner, { answer: 'An answer', reason: 'wrong' })).json(), { reported: true });
  assert.equal((await db.prepare('SELECT count(*) AS n FROM answer_report').first()).n, 1);

  // Delete one session (allowed even after the plan ends).
  const seedReady = async (sid, install, paidUntil = null) => {
    const path = `made-for-you/${install}/${sid}.m4a`;
    await fetch(new URL('/_test-media/' + path, url), { method: 'PUT', headers: { authorization: `Bearer ${secret}` }, body: 'audio' });
    await db.prepare(`INSERT INTO made_for_you (id, install_id, day, kind, lang, teen, created_at, due_at, state, audio_path, seconds, sha256, published_at, paid_until)
      VALUES (?, ?, ?, 'psalm', 'es', 0, ?, ?, 'ready', ?, 680, ?, ?, ?)`).bind(sid, install, sid.slice(0, 8), at, tonight, path, 'a'.repeat(64), at, paidUntil).run();
    return path;
  };
  const gone = await seedReady('30000000-0000-4000-a000-000000000001', id.free);
  assert.deepEqual(await (await call(id.free, { method: 'DELETE', params: '?id=30000000-0000-4000-a000-000000000001' })).json(), { deleted: 1 });
  assert.equal((await fetch(new URL(`/_test-media/${gone}?ticket=local-only`, url))).status, 404);

  // The cron: an unmade note is kept through the night after its promise, erased the morning after and she is told;
  // 30 days after the plan, audio goes; reports go at 90 days.
  const waiting = (await (await call(id.other, { body: note })).json()).id;
  assert.equal((await row(waiting)).due_at, tonight);
  const lapsedPath = await seedReady('30000000-0000-4000-a000-000000000002', id.lapsed, at - 40 * DAY);
  const cleanup = now => fetch(new URL('/_test-cleanup', url), { headers: { 'x-test-now': String(now) } }).then(r => r.json());
  await cleanup(tonight + DAY - MIN);
  assert.equal((await row(waiting)).note, note.text);
  assert.equal((await row('30000000-0000-4000-a000-000000000002')).state, 'deleted', 'the plan ended 40 days ago and RevenueCat agrees');
  assert.equal((await fetch(new URL(`/_test-media/${lapsedPath}?ticket=local-only`, url))).status, 404);
  const swept = await cleanup(tonight + DAY);
  assert.equal(swept.expired, 1);
  assert.equal((await row(waiting)).note, null);
  assert.equal((await (await call(id.other, { now: tonight + DAY })).json()).ended, 'expired');
  const ninety = await cleanup(Date.now() + 91 * DAY);
  assert.equal(ninety.reports, 1);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM made_for_you_report').first()).n, 0);
  assert.equal((await fetch(new URL(`/_test-media/${kept.results[0].audio_key}?ticket=local-only`, url))).status, 404);
});

test('a session deleted while it is being voiced leaves no audio behind, and the drain goes on to the next', async t => {
  const { db, call, row, url } = await worker(t);
  const gone = (await (await call(id.owner, { body: note })).json()).id;
  const next = (await (await call(id.other, { body: note })).json()).id;
  // The drain and the sweeps below run on the wall clock, so the rows are dated on it too (made at the
  // fixed test day, they fell to the 8-day purge of ended rows from 25 Nov 2026 and turned main red).
  await db.prepare('UPDATE made_for_you SET created_at = ? WHERE id IN (?, ?)').bind(Date.now(), gone, next).run();
  // The Mac's real drain: during the first render she deletes the session; its upload then gets a 409.
  // drop() is the Mac's own delete; here it fails (does nothing), so the Worker's sweep must remove the file.
  const runner = `
import hashlib, json, sys
from urllib.request import Request, urlopen
sys.path.insert(0, 'audio')
from made_for_you import make_request, drain_queue
base, secret, owner, gone = sys.argv[1:]
def voice(item, work):
    if item['ref'] == gone:
        with urlopen(Request(base + '/api/made-for-you?id=' + gone, method='DELETE', headers={'Authorization': 'Bearer ' + owner})) as r:
            assert json.load(r)['deleted'] == 1
    out = work / 'session.m4a'
    out.write_bytes(b'stub-voice')
    return dict(status='passed', seconds=680, sha256=hashlib.sha256(out.read_bytes()).hexdigest(), _local=str(out))
def put(item, file):
    with urlopen(Request(base + '/_test-media/' + item['file'], data=file.read_bytes(), headers={'Authorization': 'Bearer ' + secret}, method='PUT')) as r:
        assert r.status == 204
print(drain_queue(make_request(base + '/api', secret), voice, put, drop=lambda item: None))
`;
  const { stdout } = await python('python3', ['-c', runner, url.origin, secret, id.owner, gone]);
  assert.match(stdout, /MADE_FOR_YOU_ENDED/);
  assert.match(stdout.trim(), /\n1$/, 'the pass did not crash: the next session was published');
  assert.equal((await row(next)).state, 'ready');
  const ended = await row(gone);
  assert.equal(ended.state, 'deleted');
  assert.equal(ended.audio_path, `made-for-you/${id.owner}/${gone}.m4a`, 'the row kept the key of the upload in flight');
  const media = () => fetch(new URL(`/_test-media/${ended.audio_path}?ticket=local-only`, url)).then(r => r.status);
  assert.equal(await media(), 200, 'the orphan exists until the sweep');
  const cleanup = now => fetch(new URL('/_test-cleanup', url), { headers: { 'x-test-now': String(now) } }).then(r => r.json());
  await cleanup(Date.now());
  assert.equal(await media(), 404, 'the hourly sweep deleted her audio');
  assert.ok((await row(gone)).audio_path, 'while the lease runs, a late upload would still be caught');
  await cleanup(Date.now() + 3 * HOUR());
  assert.equal((await row(gone)).audio_path, null);
  // The same for a session that expires (day 7) mid-render.
  await db.prepare(`UPDATE made_for_you SET state = 'scripted', script = '{}', audio_path = NULL, lease = 'l', lease_until = ?, created_at = ? WHERE id = ?`)
    .bind(Date.now() + HOUR(), Date.now() - 8 * 24 * HOUR(), gone).run();
  await cleanup(Date.now());
  const expired = await row(gone);
  assert.equal(expired.state, 'expired');
  assert.equal(expired.audio_path, `made-for-you/${id.owner}/${gone}.m4a`);
});

test('the runner status reports queue depth, held rows and late promises for its own failure line', async t => {
  const { call } = await worker(t);
  await call(id.owner, { body: note });
  const status = async now => (await call(secret, { now, path: '/runner/status', body: {} })).json();
  assert.deepEqual(await status(at + HOUR()), { queue: 1, late: 0, held: 0, heldOnShare: 0, refusedFull: 0, oldestHours: 1 });
  assert.equal((await status(tonight + MIN)).late, 1, 'past 08:00 the promise is broken and the runner says so');
});
function HOUR() { return 3_600_000; }

// Fix 2 (review of #69): a request held on the daily free share was never failed. It sat "taking longer" for 7 days,
// took a place in every night's promise and kept its note. Now it goes first the next night, and the morning after
// its promise it ends honestly: note erased, she is told, her next request is free, and the night has room again.
test('a request held on the free share keeps its note until the morning after its promise, then ends honestly and frees her and the night', async t => {
  const { db, call, claim, row, url } = await worker(t);
  const utcDay = value => new Date(value).toISOString().slice(0, 10);
  const pacific = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(value);
  const spend = async now => {
    for (const metric of freeMetrics) {
      for (const day of new Set([utcDay(now), pacific(now)])) {
        await db.prepare('INSERT INTO chat_counts (day, metric, n) VALUES (?, ?, 100000) ON CONFLICT(day, metric) DO UPDATE SET n = 100000').bind(day, metric).run();
      }
    }
  };
  const held = (await (await call(id.owner, { body: note })).json()).id;
  // Two more requests fill the night with it (sessionsPerNight), so the stuck one is holding a real place.
  for (const other of [id.other, '10000000-0000-4000-a000-000000000009']) assert.equal((await call(other, { body: note })).status, 202);
  const cleanup = now => fetch(new URL('/_test-cleanup', url), { headers: { 'x-test-now': String(now) } }).then(r => r.json());
  // Tonight and the next night the share is spent: every claim is the named, retried hold, never a failure.
  for (const night of [at + 8 * HOUR(), tonight + 10 * HOUR()]) {
    await spend(night);
    const res = await claim(night);
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { error: 'MFY_SHARE_USED' });
  }
  // Data loss: the note is never erased while no script exists and the bound has not passed.
  const kept = await row(held);
  assert.equal(kept.state, 'queued');
  assert.equal(kept.note, note.text);
  assert.equal(kept.attempts, 0, 'a share hold is not her failure');
  // The late row goes ahead of the next night's new requests (the claim's order: earliest promise first).
  const fresh = (await (await call('10000000-0000-4000-a000-00000000000a', { now: tonight + 9 * HOUR(), body: note })).json()).id;
  const order = (await db.prepare("SELECT id FROM made_for_you WHERE state = 'queued' ORDER BY due_at, created_at, id").all()).results.map(r => r.id);
  assert.ok(order.indexOf(held) >= 0 && order.indexOf(held) < order.indexOf(fresh), JSON.stringify(order));
  const status = await (await call(secret, { now: tonight + 10 * HOUR(), path: '/runner/status', body: {} })).json();
  assert.ok(status.heldOnShare >= 1 && status.late >= 1, JSON.stringify(status));
  // The morning after its promise it ends: counted, note erased, she is told.
  const swept = await cleanup(tonight + DAY);
  assert.ok(swept.expired >= 1 && swept.expiredOnShare >= 1, JSON.stringify(swept));
  const ended = await row(held);
  assert.equal(ended.state, 'expired');
  assert.equal(ended.note, null);
  assert.equal(ended.script, null);
  const shelf = await (await call(id.owner, { now: tonight + DAY })).json();
  assert.equal(shelf.ended, 'expired');
  assert.equal(shelf.pending, null, 'never "taking longer" past the bound');
  // Her next request is not blocked, and the night's promise has room again.
  const again = await call(id.owner, { now: tonight + DAY + HOUR(), body: note });
  assert.equal(again.status, 202);
  assert.equal((await again.json()).dueAt, tomorrow + DAY);
});

// Her ruling (21 Nov 2026): free models draft first; a draft still failing after ONE free revision goes to the paid rung,
// and a free model never gets a third try on a note (run 44936173712: free drafts answered but missed the bar).
test('a free draft still failing after one revision is revised on the paid rung; the free models get two tries, never three', async t => {
  const { db, call, claim, row } = await worker(t);
  const freeDrafts = async () => (await db.prepare("SELECT COALESCE(SUM(n), 0) AS n FROM chat_counts WHERE metric LIKE 'calls:mfy:draft:%' AND metric != 'calls:mfy:draft:paid'").first()).n;
  const paid = async () => (await db.prepare("SELECT COALESCE(SUM(n), 0) AS n FROM chat_counts WHERE metric = 'paid_spend_micro'").first()).n;
  const a = (await (await call(id.owner, { body: note })).json()).id;
  const claimed = await claim(at, { 'x-test-paid': 'on', 'x-test-draft': 'stubborn' });
  assert.equal(claimed.status, 200);
  const revised = JSON.parse(decodeURIComponent(claimed.headers.get('x-test-revisions') ?? '[]'));
  assert.equal(revised.length, 2, 'one free revision, then one paid');
  const job = (await claimed.json()).job;
  assert.equal(job.id, a);
  assert.match(job.reflection.split('\n\n')[6], /This draft came from paid\.$/, 'the paid rung wrote the revised paragraph');
  assert.equal((await row(a)).state, 'scripted');
  assert.equal(await freeDrafts(), 2, 'a free model drafted and revised once, and was not asked a third time');
  assert.ok(await paid() > 0, 'the paid revision is on the paid meter');
});

test('with the paid rung at its cap, a note the free models failed twice is held (note kept), never given a third free try', async t => {
  const { db, call, claim, row } = await worker(t);
  const freeDrafts = async () => (await db.prepare("SELECT COALESCE(SUM(n), 0) AS n FROM chat_counts WHERE metric LIKE 'calls:mfy:draft:%' AND metric != 'calls:mfy:draft:paid'").first()).n;
  const b = (await (await call(id.other, { body: note })).json()).id;
  const held = await claim(at, { 'x-test-paid': 'off', 'x-test-draft': 'stubborn' });
  assert.equal(held.status, 503);
  assert.deepEqual(await held.json(), { error: 'MADE_FOR_YOU_PAID_UNAVAILABLE' });
  assert.equal(await freeDrafts(), 2);
  assert.equal((await row(b)).state, 'queued');
  assert.ok((await row(b)).note, 'the note is kept while it waits');
});

// Teens' words never reach a route that may train (security audit 23 Nov 2026, finding 8): a teen's note is drafted
// and judged by Workers AI or the private paid rung only, even with every free model up and answering.
test('a teen note is drafted and judged off every free rung that may train; an adult note still starts on them', async t => {
  const { db, call, claim, row } = await worker(t);
  const training = async () => (await db.prepare("SELECT COALESCE(SUM(n), 0) AS n FROM chat_counts WHERE metric LIKE '%gemini-free%' OR metric LIKE '%openrouter-free%'").first()).n;
  const teen = (await (await call(id.owner, { body: note, headers: { 'x-test-age': 'teen' } })).json()).id;
  assert.equal((await row(teen)).teen, 1);
  const claimed = await claim(at, { 'x-test-paid': 'on' });
  assert.equal(claimed.status, 200);
  const job = (await claimed.json()).job;
  assert.equal(job.id, teen);
  assert.match(job.reflection, /This draft came from (workers-ai|paid)\./);
  assert.doesNotMatch(job.reflection, /gemini-free|openrouter-free/);
  assert.equal(await training(), 0, 'no free rung that may train was booked or asked');
  // Control: an adult note on the same Worker drafts on the strongest free model (the count above can move).
  const adult = (await (await call(id.other, { body: note })).json()).id;
  const two = await (await claim(at, { 'x-test-paid': 'on' })).json();
  assert.equal(two.job.id, adult);
  assert.match(two.job.reflection, new RegExp(`This draft came from ${strongest}\\.`));
  assert.ok(await training() > 0);
});

// Her ruling, 21 Nov 2026: free models first; when they are busy, empty or rate-limited, the private paid model drafts
// and judges, so a session never fails or slips for that. Its spend goes into chat's one paid meter.
test('free rungs busy (429), down or out of share: the private paid rung drafts and judges, the session completes, and its spend is on the paid meter', async t => {
  const { db, call, claim, row } = await worker(t);
  const meter = async () => (await db.prepare("SELECT COALESCE(SUM(n), 0) AS n FROM chat_counts WHERE metric = 'paid_spend_micro'").first()).n;
  const paidOn = { 'x-test-paid': 'on' };
  // 1. Every free rung rate-limited (429) or failing: the paid rung answers.
  const a = (await (await call(id.owner, { body: note })).json()).id;
  const one = await claim(at, { ...paidOn, 'x-test-models-429': 'workers-ai,gemini-free', 'x-test-models-down': 'openrouter-free' });
  assert.equal(one.status, 200);
  const job = (await one.json()).job;
  assert.equal(job.id, a);
  assert.match(job.reflection, /This draft came from paid\./, 'drafted on the paid rung');
  assert.equal((await row(a)).state, 'scripted');
  assert.equal((await row(a)).note, null, 'the note is erased once the script exists, as on a free draft');
  const afterOne = await meter();
  assert.ok(afterOne > 0, 'its cost is booked in paid_spend_micro (the $100 monthly cap)');
  // 2. The made-for-you free share used up for the day (MFY_SHARE_USED on every free rung): the paid rung answers.
  const day = new Date(at).toISOString().slice(0, 10), pacific = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles' }).format(at);
  for (const metric of freeMetrics) {
    for (const d of new Set([day, pacific])) await db.prepare('INSERT INTO chat_counts (day, metric, n) VALUES (?, ?, 100000) ON CONFLICT(day, metric) DO UPDATE SET n = 100000').bind(d, metric).run();
  }
  const b = (await (await call(id.other, { body: note })).json()).id;
  const two = await claim(at + MIN, paidOn);
  assert.equal(two.status, 200);
  assert.equal((await two.json()).job.id, b);
  assert.ok(await meter() > afterOne);
  // 3. At the monthly cap the paid rung is left out: the same night holds with the named, retried stop (never a failure).
  const c = (await (await call('10000000-0000-4000-a000-000000000009', { body: note })).json()).id;
  const held = await claim(at + 2 * MIN);
  assert.equal(held.status, 503);
  assert.deepEqual(await held.json(), { error: 'MFY_SHARE_USED' });
  assert.equal((await row(c)).note, note.text);
  assert.equal((await row(c)).attempts, 0);
});

test('the paid key out of credit (402) or past its limit (403) is busy: the row waits with its note and is made on the next try', async t => {
  const { claim, call, row } = await worker(t);
  const a = (await (await call(id.owner, { body: note })).json()).id;
  const allFree = { 'x-test-models-429': 'workers-ai,gemini-free,openrouter-free' };
  let now = at;
  for (const status of ['402', '403']) {
    const res = await claim(now, { ...allFree, 'x-test-paid': status });
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { error: 'MADE_FOR_YOU_NO_FREE_MODEL' }, `${status} is a retried hold`);
    const held = await row(a);
    assert.equal(held.state, 'queued');
    assert.equal(held.note, note.text, 'the note is kept while no script exists');
    assert.equal(held.attempts, 0, 'never counted as her failed try');
    now += 16 * MIN;
  }
  const made = await claim(now, { ...allFree, 'x-test-paid': 'on' });
  assert.equal(made.status, 200);
  assert.equal((await made.json()).job.id, a);
});
