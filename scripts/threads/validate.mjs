#!/usr/bin/env node
// Threads @peacebestillapp daily loop (scripts/threads/threads_loop.mjs). No network. Fails if:
// 1. the bank is not 60+ posts with the 14 approved ones, links or Questions are not about 1 in
//    5, two Questions sit back to back, a Chat has no verse, a new post names grief, death,
//    illness, abuse, police or a child in danger, or (from day 15 on) a 7-post run lacks the
//    full name "Hush Harbor · Black Bible Chat & Stories" or "Hush Harbor is AI";
// 2. any bank post fails the queue-time content check in either store state, or the check
//    misses a changed verse word (KJV and RV1909), a Mindset / Imagination Nights / manifest /
//    law of assumption word, a second tag, or store wording in the wrong state;
// 3. store wording does not switch "coming soon" to "Free on iPhone" once store.json is set;
// 4. slots are not 21:30 America/Chicago (CST and CDT), or the window is not 7 days;
// 5. after the bank runs out it does not recycle the oldest 60+ day evergreen post, or puts two
//    Questions on consecutive days, or overfills the shared organisation limit without a note;
// 6. end to end against a fake Buffer: no @peacebestillapp channel is not the green
//    THREADS_CHANNEL_NOT_CONNECTED note with its OUTPUT line, the @approvalprep Threads channel is
//    ever posted to, a duplicate name is not AMBIGUOUS_THREADS_CHANNEL, a missing token, a
//    paused queue or a blocked post is not its named stop.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LINK, TAG, contentProblems, main, planRun, quotedVerses, slotsAhead, slotUtc, storeText } from './threads_loop.mjs';

const bank = JSON.parse(fs.readFileSync('data/threads/posts.json', 'utf8'));
const LIVE = { app_store_url: 'https://apps.apple.com/app/id0000000000' };
const FULL_NAME = 'Hush Harbor · Black Bible Chat & Stories';
const SENSITIVE = /\b(?:died|dies|death|dead|funeral|grie(?:f|ving)|passed away|cancer|hospital|diagnos\w*|chemo|sick|illness|abus\w*|police|cops?|arrest\w*|missing child|kidnap\w*|overdose|suicid\w*|murder\w*|shot|muri[óo]|funeral|hospital|polic[íi]a|c[áa]ncer)\b/i;
const fails = [];
const check = async (name, fn) => { try { await fn(); } catch (e) { fails.push(`${name}: ${e.message.split('\n')[0]}`); } };

// 1-2. the bank
await check('bank shape', () => {
  assert.ok(bank.posts.length >= 60, `${bank.posts.length} posts`);
  assert.equal(new Set(bank.posts.map((p) => p.id)).size, bank.posts.length, 'duplicate id');
  assert.equal(bank.posts.filter((p) => p.approved).length, 14, 'the 14 approved posts');
  const share = (f) => bank.posts.filter(f).length / bank.posts.length;
  assert.ok(share((p) => p.link) >= 0.15 && share((p) => p.link) <= 0.3, `linked share ${share((p) => p.link)}`);
  assert.ok(share((p) => p.type === 'Question') >= 0.15 && share((p) => p.type === 'Question') <= 0.3, 'Question share');
  for (let i = 1; i < bank.posts.length; i += 1) assert.ok(!(bank.posts[i].type === 'Question' && bank.posts[i - 1].type === 'Question'), `${bank.posts[i].id}: two Questions back to back`);
  for (let end = 14; end < bank.posts.length; end += 1) {
    const run = bank.posts.slice(end - 6, end + 1).map((p) => p.text).join('\n');
    assert.ok(run.includes(FULL_NAME), `no full name in days ${end - 5}-${end + 1}`);
    assert.ok(run.includes('Hush Harbor is AI') || /Young Faith is the teen voice of an AI/.test(run), `Hush Harbor not called AI in days ${end - 5}-${end + 1}`);
  }
});
for (const p of bank.posts) await check(p.id, () => {
  assert.ok(['Chat', 'Question', 'Story', 'About'].includes(p.type), p.type);
  assert.deepEqual(contentProblems(p, p.text, {}), [], 'content check (coming soon)');
  assert.deepEqual(contentProblems(p, storeText(p.text, LIVE), LIVE), [], 'content check (store live)');
  if (p.type === 'Chat') assert.ok(quotedVerses(p.text).length >= 1, 'a Chat with no verse');
  if (p.link) assert.ok(p.text.includes(LINK), 'no tagged link');
  else assert.ok(!p.text.includes('peacebestillapp.com'), 'an unlinked post carries the link');
  if (!p.approved) assert.ok(!SENSITIVE.test(p.text), `sensitive subject: ${p.text.match(SENSITIVE)?.[0]}`);
  if (p.lang === 'es') assert.match(p.text, /^Yo: [\s\S]*\nMi Refugio: /, 'Spanish chat format');
  if (p.series === 'Young Faith') assert.ok(p.text.includes('No chat under 13.'), 'Young Faith without the age line');
});
const chat = bank.posts.find((p) => p.type === 'Chat' && p.lang === 'en');
const es = bank.posts.find((p) => p.lang === 'es');
await check('content check catches what must never go out', () => {
  const v = quotedVerses(chat.text)[0].quote;
  const swapped = v.replace(/\b(\w+)\b/, (w) => (w === 'the' ? 'a' : 'the'));
  assert.ok(contentProblems(chat, chat.text.replace(v, swapped), {}).some((x) => x.includes('word for word')), 'a changed KJV word');
  const ve = quotedVerses(es.text)[0].quote;
  assert.ok(contentProblems(es, es.text.replace(ve, ve.replace(/[aeiou]/, 'x')), {}).some((x) => x.includes('RV1909 word for word')), 'a changed RV1909 letter');
  assert.ok(contentProblems(chat, chat.text.replace(/\n(\w[^\n]* \d+:\d+)\n/, '\nPsalms 999:1\n'), {}).length, 'a reference that does not exist');
  for (const bad of ['Try Imagination Nights tonight.', 'Shift your mindset.', 'Manifest it, baby.', 'The law of assumption says so.', 'Assume the feeling of the wish fulfilled.', 'The universe is listening.', 'Speak life over it.', 'You will be healed.', 'Ain’t nobody got time.']) {
    assert.ok(contentProblems(chat, chat.text.replace(TAG, `${bad}\n\n${TAG}`), {}).length, bad);
  }
  assert.ok(contentProblems(chat, `${chat.text} #blessed`, {}).length, 'a second tag');
  assert.ok(contentProblems(chat, chat.text.replace(TAG, `Free on iPhone.\n\n${TAG}`), {}).length, 'store wording before the link is set');
  assert.ok(contentProblems(chat, chat.text.replace(TAG, `Coming soon.\n\n${TAG}`), LIVE).length, 'coming soon once the store link is set');
});

// 3. store wording
await check('store wording follows site/config/store.json', () => {
  const free = bank.posts.find((p) => p.text.includes('Coming to iPhone soon'));
  assert.ok(free, 'the approved free-forever post');
  assert.ok(storeText(free.text, LIVE).includes('Free on iPhone.') && !/coming/i.test(storeText(free.text, LIVE)));
  const linked = bank.posts.find((p) => p.text.includes('is coming soon:'));
  assert.ok(storeText(linked.text, LIVE).includes('Hush Harbor is free on iPhone: peacebestillapp.com'));
  assert.equal(storeText(linked.text, { app_store_url: null }), linked.text);
});

// 4. slots
await check('slots are 21:30 Central', () => {
  assert.equal(slotUtc('2026-11-18', '21:30'), '2026-11-19T03:30:00.000Z');
  assert.equal(slotUtc('2027-04-01', '21:30'), '2027-04-02T02:30:00.000Z');
  const s = slotsAhead(Date.parse('2026-11-18T20:00:00Z'), bank);
  assert.equal(s.length, 7); assert.equal(s[0].date, '2026-11-18'); assert.equal(s[6].date, '2026-11-24');
  assert.equal(slotsAhead(Date.parse('2026-11-19T03:20:00Z'), bank)[0].date, '2026-11-19', 'a slot under 15 minutes away is skipped');
});

// 5. plan
const NOW = Date.parse('2026-11-18T14:00:00Z');
const mk = (id, type, extra = {}) => ({ ...chat, id, type, approved: undefined, evergreen: true, ...extra });
const mini = (posts) => ({ slot_time_ct: '21:30', days_ahead: 7, recycle_after_days: 60, bank_low_below: 14, posts });
await check('recycles the oldest 60+ day evergreen post, never Question twice in a row', () => {
  const q = bank.posts.find((p) => p.type === 'Question');
  const day = (n) => new Date(NOW - n * 86_400_000).toISOString();
  const b = mini([mk('q1', 'Question', { text: q.text }), mk('q2', 'Question', { text: q.text }), mk('s1', 'Chat'), mk('s2', 'Chat'), mk('m1', 'Story'), mk('m2', 'Story'), mk('r1', 'Chat', { evergreen: false }), mk('s3', 'Chat')]);
  const ledger = { posts: { q1: { runs: [{ due_at: day(90) }] }, q2: { runs: [{ due_at: day(89) }] }, s1: { runs: [{ due_at: day(88) }] }, s2: { runs: [{ due_at: day(70) }] }, m1: { runs: [{ due_at: day(65) }] }, m2: { runs: [{ due_at: day(62) }] }, r1: { runs: [{ due_at: day(95) }] }, s3: { runs: [{ due_at: day(10) }] } } };
  const r = planRun({ bank: b, ledger, pending: [], now: NOW, orgRoom: 10, store: {} });
  const ids = r.picks.map((p) => p.post.id);
  assert.equal(ids[0], 'q1'); assert.equal(ids[1], 's1', 'q2 would be a second Question in a row'); assert.equal(ids[2], 'q2');
  assert.ok(!ids.includes('r1'), 'a non-evergreen post was recycled');
  assert.equal(r.picks.length, 7, 'recycling must keep all 7 slots filled');
});
await check('the shared organisation limit is respected and named', () => {
  const r = planRun({ bank, ledger: { posts: {} }, pending: [], now: NOW, orgRoom: 3, store: {} });
  assert.equal(r.picks.length, 3);
  assert.ok(r.notes.some((n) => n.startsWith('THREADS_ORG_LIMIT 4 evening(s)')), JSON.stringify(r.notes));
});

// 6. end to end against a fake Buffer
function fakeBuffer({ channels, scheduled = [] }) {
  const made = [];
  const fetchImpl = async (_url, init) => {
    const { query, variables } = JSON.parse(init.body);
    let data;
    if (query.includes('account')) data = { account: { organizations: [{ id: 'org', limits: { scheduledPosts: 10 } }] } };
    else if (query.includes('channels')) data = { channels };
    else if (query.includes('createPost')) { made.push(variables.i); data = { createPost: { __typename: 'PostActionSuccess', post: { id: `p${made.length}`, dueAt: variables.i.dueAt } } }; }
    else if (query.includes('posts(')) data = { posts: { edges: query.includes('[scheduled]') ? scheduled.map((node) => ({ node })) : [] } };
    return { ok: true, status: 200, json: async () => ({ data }) };
  };
  return { fetchImpl, made };
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pbs-threads-'));
const notLive = path.join(tmp, 'store-null.json'); fs.writeFileSync(notLive, JSON.stringify({ app_store_url: null, play_url: null }));
const live = path.join(tmp, 'store-live.json'); fs.writeFileSync(live, JSON.stringify(LIVE));
const run = async (opts) => { const lines = []; const ledgerFile = path.join(tmp, `l${Math.random()}.json`); try { const r = await main({ now: NOW, env: { BUFFER_APPROVALPREP_ACCESS_TOKEN: 't' }, log: (l) => lines.push(l), ledgerFile, storeFile: notLive, ...opts }); return { r, lines, ledgerFile }; } catch (e) { return { e, lines, ledgerFile }; } };
const ap = { id: 'ap', service: 'threads', name: 'approvalprep', isQueuePaused: false };
const ig = { id: 'ig', service: 'instagram', name: 'peacebestillapp', isQueuePaused: false };
const pbs = { id: 'pbs', service: 'threads', name: 'peacebestillapp', isQueuePaused: false };
await check('not connected yet: a green note, the OUTPUT line, and never the @approvalprep channel', async () => {
  const fb = fakeBuffer({ channels: [ap, ig] });
  const { e, lines } = await run({ fetchImpl: fb.fetchImpl });
  assert.ok(!e, e?.message);
  assert.equal(fb.made.length, 0, 'posted while not connected');
  assert.ok(lines.some((l) => l.startsWith('NAMED NOTE THREADS_CHANNEL_NOT_CONNECTED')), lines.join(' | '));
  assert.ok(lines.includes(`OUTPUT: queued 0, scheduled ahead 0, bank unposted ${bank.posts.length}, recycled 0`), lines.join(' | '));
});
await check('named stops', async () => {
  assert.equal((await run({ env: {} })).e?.code, 'SECRET_MISSING_BUFFER_APPROVALPREP_ACCESS_TOKEN');
  assert.equal((await run({ fetchImpl: fakeBuffer({ channels: [ap, pbs, { ...pbs, id: 'pbs2' }] }).fetchImpl })).e?.code, 'AMBIGUOUS_THREADS_CHANNEL');
  assert.equal((await run({ fetchImpl: fakeBuffer({ channels: [{ ...pbs, isQueuePaused: true }] }).fetchImpl })).e?.code, 'THREADS_QUEUE_PAUSED');
});
await check('connected: 7 posts at 21:30 CT, only to @peacebestillapp, from the real bank', async () => {
  const fb = fakeBuffer({ channels: [ap, ig, pbs] });
  const { r, e, lines, ledgerFile } = await run({ fetchImpl: fb.fetchImpl });
  assert.ok(!e, e?.message);
  assert.equal(fb.made.length, 7);
  for (const i of fb.made) { assert.equal(i.channelId, 'pbs'); assert.equal(i.mode, 'customScheduled'); assert.equal(i.metadata.threads.type, 'post'); assert.match(new Date(i.dueAt).toLocaleString('en-US', { timeZone: 'America/Chicago' }), /9:30:00 PM/); }
  assert.equal(fb.made[0].text, bank.posts[0].text);
  assert.ok(lines.includes(`OUTPUT: queued 7, scheduled ahead 7, bank unposted ${bank.posts.length - 7}, recycled 0`), lines.join(' | '));
  assert.equal(Object.keys(JSON.parse(fs.readFileSync(ledgerFile, 'utf8')).posts).length, 7);
  assert.equal(r.queued, 7);
});
await check('store link set: the job reads store.json and says Free on iPhone', async () => {
  const fb = fakeBuffer({ channels: [pbs] });
  const ledgerFile = path.join(tmp, 'store-ledger.json');
  const free = bank.posts.findIndex((p) => p.text.includes('Coming to iPhone soon'));
  fs.writeFileSync(ledgerFile, JSON.stringify({ posts: Object.fromEntries(bank.posts.slice(0, free).map((p, i) => [p.id, { runs: [{ due_at: new Date(NOW - (30 - i) * 86_400_000).toISOString() }] }])) }));
  const { e } = await run({ fetchImpl: fb.fetchImpl, storeFile: live, ledgerFile });
  assert.ok(!e, e?.message);
  assert.ok(fb.made[0].text.includes('Free on iPhone.') && !/coming/i.test(fb.made[0].text), fb.made[0].text);
});
await check('a blocked post is red, the others still go', async () => {
  const small = path.join(tmp, 'bank.json');
  const bad = { ...chat, id: 'bad', approved: undefined, text: chat.text.replace(TAG, `Tonight, Imagination Nights.\n\n${TAG}`) };
  fs.writeFileSync(small, JSON.stringify(mini([bad, ...bank.posts.slice(1, 9)])));
  const fb = fakeBuffer({ channels: [pbs] });
  const { e } = await run({ bankFile: small, fetchImpl: fb.fetchImpl });
  assert.equal(e?.code, 'THREADS_CONTENT_BLOCKED');
  assert.equal(fb.made.length, 7); assert.ok(!fb.made.some((i) => i.text === bad.text));
});
fs.rmSync(tmp, { recursive: true, force: true });

if (fails.length) { console.error(`[validate:threads-loop] FAIL\n- ${fails.join('\n- ')}`); process.exit(1); }
console.log(`[validate:threads-loop] OK - ${bank.posts.length} posts, every verse word for word, faith-only, loop and stops proven`);
