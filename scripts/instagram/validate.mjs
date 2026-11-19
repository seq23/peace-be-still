#!/usr/bin/env node
// Instagram + Facebook picture loop (scripts/instagram/ig_loop.mjs). No network. Fails if:
// 1. the bank is not 30+ posts led by the 9 approved ones in the approved order, a 3-post week
//    lacks Hush Harbor's full name and "Hush Harbor is AI", carousels are not about half, or a
//    new post names grief, death, illness, abuse, police or a child in danger;
// 2. any post fails the queue-time check in either store state (verses word for word KJV /
//    RV1909 on pictures and captions, faith only, AI line, Young Faith age line, hashtags, store
//    wording, no italic verse words), or the check misses a changed verse word, Imagination
//    Nights, a missing AI line, #blackbiblestories, an emoji, italics, or wrong store wording;
// 3. a picture does not match its post (frames.lock.json) or its PNG is missing / the wrong size;
// 4. slots are not Sun / Tue / Thu 20:00 America/Chicago (CST and CDT);
// 5. the plan overfills the room it is given, splits one slot across two posts, or does not
//    recycle the oldest 60+ day evergreen post;
// 6. end to end against a fake Buffer: no channels is not the green note with its OUTPUT line;
//    a channel with another name (an @approvalprep one) is ever posted to; duplicates are not
//    AMBIGUOUS_IG_CHANNEL; a missing token, a paused queue, a picture that does not open, a
//    failed publish are not their named stops; a refused Reel does not fall back to the picture;
//    data/social/metrics.json is not written with numbers or "not read" + why;
// 7. the Buffer token name in scripts/threads/buffer.mjs is not the secret both workflows pass,
//    or a 24-hex Buffer id (organisation or channel) sits in the repo's social code or data.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ORG_SPLIT, TOKEN_ENV } from '../threads/buffer.mjs';
import { SPLIT, quotedVerses, slotUtc } from '../threads/threads_loop.mjs';
import { frameHtml, postFrames } from './frames.mjs';
import { HH_AI, HH_FULL, igProblems, igStoreText, italicProblem, main, planRun, slotsAhead } from './ig_loop.mjs';

const bank = JSON.parse(fs.readFileSync('data/instagram/posts.json', 'utf8'));
const lock = JSON.parse(fs.readFileSync('data/instagram/frames.lock.json', 'utf8'));
const LIVE = { app_store_url: 'https://apps.apple.com/app/id0000000000' };
const SENSITIVE = /\b(?:died|dies|death|dead|funeral|grie(?:f|ving)|passed away|cancer|hospital|diagnos\w*|chemo|sick|illness|abus\w*|police|cops?|arrest\w*|missing child|kidnap\w*|overdose|suicid\w*|murder\w*|shot|muri[óo]|polic[íi]a|c[áa]ncer)\b/i;
const fails = [];
const check = async (name, fn) => { try { await fn(); } catch (e) { fails.push(`${name}: ${e.message.split('\n')[0]}`); } };

// 1. the bank
await check('bank shape', () => {
  assert.ok(bank.posts.length >= 30, `${bank.posts.length} posts`);
  assert.equal(new Set(bank.posts.map((p) => p.id)).size, bank.posts.length, 'duplicate id');
  assert.deepEqual(bank.posts.slice(0, 9).map((p) => p.id), ['p1', 'p3', 'p2', 'p5', 'p6', 'p4', 'p7', 'p8', 'p9'], 'the 9 approved posts lead, in the approved order');
  assert.equal(bank.posts.filter((p) => p.approved).length, 9, 'exactly the 9 approved posts are marked approved');
  assert.equal(bank.slot_time_ct, '20:00'); assert.deepEqual(bank.weekdays_ct, ['Sun', 'Tue', 'Thu']); assert.equal(bank.posts_ahead, 3);
  const multi = bank.posts.filter((p) => p.frames.length > 1).length / bank.posts.length;
  assert.ok(multi >= 0.3 && multi <= 0.65, `carousel share ${multi}`);
  for (let w = 0; w + 3 <= bank.posts.length; w += 3) {
    const week = bank.posts.slice(w, w + 3).map((p) => p.caption).join('\n');
    assert.ok(week.includes(HH_FULL), `week ${w / 3 + 1}: no "${HH_FULL}"`);
    assert.ok(HH_AI.test(week), `week ${w / 3 + 1}: Hush Harbor not called AI`);
  }
});
for (const p of bank.posts) await check(p.id, () => {
  assert.ok(['Chat', 'Story', 'Verse', 'About'].includes(p.kind), p.kind);
  assert.deepEqual(igProblems(p, {}, lock), [], 'queue-time check (coming soon)');
  assert.deepEqual(igProblems(p, LIVE), [], 'queue-time check (store live)');
  if (p.kind === 'Chat' || p.kind === 'Story' || p.kind === 'Verse') assert.ok(quotedVerses(p.caption).length >= 1, 'no verse in the caption');
  if (!p.approved) {
    const words = `${p.caption}\n${JSON.stringify(p.frames)}`;
    assert.ok(!SENSITIVE.test(words), `sensitive subject: ${words.match(SENSITIVE)?.[0]}`);
  }
});

// 2. the check catches what must never go out
const chat = bank.posts.find((p) => p.id === 'p3');
const es = bank.posts.find((p) => p.lang === 'es');
const has = (post, store, re) => igProblems(post, store).some((x) => re.test(x));
await check('the queue-time check catches what must never go out', () => {
  const v = quotedVerses(chat.caption)[0].quote;
  assert.ok(has({ ...chat, caption: chat.caption.replace(v, v.replace('supply', 'send')) }, {}, /word for word/), 'a changed KJV word');
  const ve = quotedVerses(es.caption)[0].quote;
  assert.ok(has({ ...es, caption: es.caption.replace(ve, ve.replace(/[aeiou]/, 'x')) }, {}, /RV1909 word for word/), 'a changed RV1909 letter');
  assert.ok(has({ ...chat, caption: chat.caption.replace('#blackbiblechat', 'Try Imagination Nights tonight.\n#blackbiblechat') }, {}, /faith-only/), 'Imagination Nights in a caption');
  assert.ok(has({ ...chat, frames: [{ ...chat.frames[1], blocks: [{ say: 'Manifest it, baby.' }] }] }, {}, /NEVER|faith-only/), 'manifest on a picture');
  assert.ok(has({ ...chat, caption: chat.caption.replace(' is AI', '') }, {}, /without saying it is AI/), 'no AI line');
  assert.ok(has({ ...chat, caption: chat.caption.replace('#prayer', '#blackbiblestories') }, {}, /NEVER|approved list/), '#blackbiblestories');
  assert.ok(has({ ...chat, caption: chat.caption.replace('#prayer', '#prayer #a #b') }, {}, /3 to 5 hashtags/), 'six hashtags');
  assert.ok(has({ ...chat, caption: `${chat.caption} 🙏` }, {}, /emoji/), 'an emoji');
  assert.ok(has({ ...chat, caption: chat.caption.replace('Coming soon to iPhone.', 'Free on iPhone.') }, {}, /store wording|coming soon/), 'store wording before the link is set');
  assert.ok(has({ ...chat, caption: chat.caption.replace('Coming soon to iPhone.', 'Coming soon.') }, LIVE, /coming soon/), 'coming soon once the link is set');
  assert.ok(has({ ...es, caption: es.caption.replace('Muy pronto en iPhone.', 'Muy pronto.') }, LIVE, /muy pronto/), 'muy pronto once the link is set');
  assert.ok(has({ ...bank.posts.find((p) => p.id === 'p8'), caption: bank.posts.find((p) => p.id === 'p8').caption.replace('No chat under 13. ', '') }, {}, /No chat under 13/), 'Young Faith without the age line');
  const verseFrame = bank.posts.find((p) => p.id === 'p2').frames[0];
  assert.ok(italicProblem(frameHtml({ ...verseFrame, css: '.verse em{font-style:italic}' }).html), 'italic verse words');
  assert.equal(italicProblem(frameHtml(verseFrame).html), null);
  assert.ok(has({ ...chat, frames: [{ ...chat.frames[0], blocks: [{ hh: [{ verse: 'PSA 23:1' }] }] }] }, {}, /not quoted in the caption/), 'a picture verse missing from the caption');
  assert.equal(igStoreText('Coming soon to iPhone. Muy pronto en iPhone.', LIVE), 'Free on iPhone. Gratis en iPhone.');
});

// 3. pictures
const pngSize = (f) => { const b = fs.readFileSync(f); assert.equal(b.toString('ascii', 1, 4), 'PNG', `${f} is not a PNG`); return [b.readUInt32BE(16), b.readUInt32BE(20)]; };
await check('every picture is rendered from its current post', () => {
  for (const p of bank.posts) for (const { file, frame } of postFrames(p)) {
    assert.deepEqual(pngSize(`site/public/social/ig/${file}.png`), [1080, frame.h ?? (file.endsWith('-reel') ? 1920 : 1350)], file);
  }
  for (const p of bank.posts.filter((x) => x.reel)) assert.ok(fs.statSync(`site/public/social/ig/${p.reel.video}`).size > 50_000, `${p.reel.video} missing`);
});

// 4. slots
await check('slots are Sun / Tue / Thu 20:00 Central', () => {
  assert.equal(slotUtc('2026-11-19', '20:00'), '2026-11-20T02:00:00.000Z');
  assert.equal(slotUtc('2027-04-01', '20:00'), '2027-04-02T01:00:00.000Z');
  const s = slotsAhead(Date.parse('2026-11-18T20:00:00Z'), bank);
  assert.deepEqual(s.map((x) => `${x.day} ${x.date}`), ['Thu 2026-11-19', 'Sun 2026-11-22', 'Tue 2026-11-24']);
  assert.equal(slotsAhead(Date.parse('2026-11-20T01:50:00Z'), bank)[0].date, '2026-11-22', 'a slot under 15 minutes away is skipped');
});

// 5. plan
const NOW = Date.parse('2026-11-18T14:00:00Z');
await check('the plan respects its room and keeps one post per slot on both channels', () => {
  const r = planRun({ bank, ledger: { posts: {} }, pending: [], now: NOW, room: 3, channels: ['instagram', 'facebook'], store: {}, lock });
  assert.equal(r.jobs.length, 3);
  assert.deepEqual(r.jobs.map((j) => `${j.channel} ${j.post.id} ${j.slot.date}`), ['instagram p1 2026-11-19', 'facebook p1 2026-11-19', 'instagram p3 2026-11-22']);
  assert.ok(r.notes.some((n) => n.startsWith('IG_ORG_LIMIT 3 post(s)')), JSON.stringify(r.notes));
  const ledger = { posts: { p1: { runs: [{ channel: 'instagram', due_at: '2026-11-20T02:00:00.000Z' }] } } };
  const r2 = planRun({ bank, ledger, pending: [{ channelKey: 'instagram', dueAt: '2026-11-20T02:00:00.000Z' }], now: NOW, room: 6, channels: ['instagram', 'facebook'], store: {}, lock });
  assert.equal(r2.jobs[0].post.id, 'p1', 'facebook gets the same post instagram already has that evening');
  assert.equal(r2.jobs[0].channel, 'facebook');
});
await check('recycles the oldest 60+ day evergreen post after the bank', () => {
  const day = (n) => new Date(NOW - n * 86_400_000).toISOString();
  const ledger = { posts: Object.fromEntries(bank.posts.map((p, i) => [p.id, { runs: [{ due_at: day(i < 2 ? 100 - i : 30) }] }])) };
  const r = planRun({ bank, ledger, pending: [], now: NOW, room: 6, channels: ['instagram'], store: {}, lock });
  assert.deepEqual(r.jobs.map((j) => j.post.id).slice(0, 2), ['p1', 'p3']);
  assert.ok(r.jobs.every((j) => j.recycled));
  assert.ok(r.notes.some((n) => n.startsWith('IG_RECYCLE_UNDER_60')), 'third slot has no 60+ day post');
});

// 6. end to end against a fake Buffer
function fakeBuffer({ channels, scheduled = [], refuseReel = false, refuseAll = false, mediaStatus = 200, errors = [] }) {
  const made = [];
  const fetchImpl = async (url, init) => {
    if (init?.method === 'HEAD') return { status: mediaStatus, headers: { get: () => (url.includes('.mp4') ? 'video/mp4' : 'image/png') } };
    const { query, variables } = JSON.parse(init.body);
    let data;
    if (query.includes('account')) data = { account: { organizations: [{ id: 'org', limits: { scheduledPosts: 10 } }] } };
    else if (query.includes('channels(')) data = { channels };
    else if (query.includes('createPost')) {
      if (refuseAll || (refuseReel && variables.i.assets[0]?.video)) data = { createPost: { __typename: 'MutationError', message: refuseAll ? 'Invalid post' : 'reels not allowed' } };
      else if (variables.i.metadata?.instagram?.type === 'carousel') data = { createPost: { __typename: 'MutationError', message: "Instagram does not support the 'carousel' post type" } };
      else { made.push(variables.i); data = { createPost: { __typename: 'PostActionSuccess', post: { id: `b${made.length}`, dueAt: variables.i.dueAt } } }; }
    } else if (query.includes('aggregatedPostMetrics')) data = { aggregatedPostMetrics: { metrics: [{ type: 'views', value: 12 }] } };
    else if (query.includes('[sent]')) data = { posts: { edges: [{ node: { id: 'b1', channelId: 'ig', sentAt: '2026-11-20T02:00:05Z' } }], pageInfo: { hasNextPage: false } } };
    else if (query.includes('[error]')) data = { posts: { edges: errors.map((node) => ({ node })) } };
    else if (query.includes('posts(')) data = { posts: { edges: query.includes('[scheduled]') ? scheduled.map((node) => ({ node })) : [] } };
    return { ok: true, status: 200, json: async () => ({ data }) };
  };
  return { fetchImpl, made };
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pbs-ig-'));
const storeNull = path.join(tmp, 'store.json'); fs.writeFileSync(storeNull, JSON.stringify({ app_store_url: null }));
const run = async (opts) => {
  const lines = []; const k = Math.random();
  const files = { ledgerFile: path.join(tmp, `l${k}.json`), metricsFile: path.join(tmp, `m${k}.json`), threadsLedgerFile: path.join(tmp, 'none.json') };
  try { const r = await main({ now: NOW, env: { [TOKEN_ENV]: 't' }, log: (l) => lines.push(l), storeFile: storeNull, ...files, ...opts }); return { r, lines, ...files }; } catch (e) { return { e, lines, ...files }; }
};
const ig = { id: 'ig', service: 'instagram', name: 'peacebestillapp', isQueuePaused: false };
const fb = { id: 'fb', service: 'facebook', name: 'Peace Be Still', isQueuePaused: false };
const apIg = { id: 'apig', service: 'instagram', name: 'approvalprep', isQueuePaused: false };
const th = { id: 'th', service: 'threads', name: 'peacebestillapp', isQueuePaused: false };
await check('not connected: green notes, the OUTPUT line, metrics written, never another channel', async () => {
  const f = fakeBuffer({ channels: [apIg, th] });
  const { e, lines, metricsFile } = await run({ fetchImpl: f.fetchImpl });
  assert.ok(!e, e?.message);
  assert.equal(f.made.length, 0, 'posted to a channel with another name');
  assert.equal(lines.filter((l) => l.startsWith('NAMED NOTE IG_CHANNEL_NOT_CONNECTED')).length, 2, lines.join(' | '));
  assert.ok(lines.includes(`OUTPUT: queued 0 (instagram 0, facebook 0), scheduled ahead 0, bank unposted ${bank.posts.length}, recycled 0 (${SPLIT})`), lines.join(' | '));
  const m = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
  assert.equal(m.channels.instagram.posts_sent, 'not read'); assert.ok(m.channels.instagram.posts_sent_why);
  assert.equal(m.channels.threads.views_28d, 12);
  assert.equal(m.social_visits_28d, 'not read'); assert.ok(m.social_visits_28d_why);
});
await check('named stops', async () => {
  assert.equal((await run({ env: {} })).e?.code, `SECRET_MISSING_${TOKEN_ENV}`);
  assert.equal((await run({ fetchImpl: fakeBuffer({ channels: [ig, { ...ig, id: 'ig2' }] }).fetchImpl })).e?.code, 'AMBIGUOUS_IG_CHANNEL');
  assert.equal((await run({ fetchImpl: fakeBuffer({ channels: [{ ...ig, isQueuePaused: true }, fb] }).fetchImpl })).e?.code, 'IG_QUEUE_PAUSED');
  const refused = await run({ fetchImpl: fakeBuffer({ channels: [ig, fb], refuseAll: true }).fetchImpl });
  assert.equal(refused.e?.code, 'BUFFER_POST_REFUSED');
  assert.ok(fs.existsSync(refused.metricsFile), 'metrics.json not written when Buffer refused a post');
  const f = fakeBuffer({ channels: [ig, fb], mediaStatus: 404 });
  const r = await run({ fetchImpl: f.fetchImpl });
  assert.equal(r.e?.code, 'IG_CONTENT_BLOCKED'); assert.equal(f.made.length, 0, 'queued a post whose picture does not open');
});
await check('connected: the same post at 20:00 CT to instagram and facebook, room for 6, real bank', async () => {
  const f = fakeBuffer({ channels: [apIg, th, ig, fb] });
  const { r, e, lines, ledgerFile, metricsFile } = await run({ fetchImpl: f.fetchImpl });
  assert.ok(!e, e?.message);
  assert.equal(f.made.length, ORG_SPLIT.pictures);
  assert.deepEqual(f.made.map((i) => i.channelId), ['ig', 'fb', 'ig', 'fb', 'ig', 'fb']);
  for (const i of f.made) { assert.equal(i.mode, 'customScheduled'); assert.match(new Date(i.dueAt).toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'short' }), /^(Sun|Tue|Thu)/); assert.match(new Date(i.dueAt).toLocaleString('en-US', { timeZone: 'America/Chicago' }), /8:00:00 PM/); }
  assert.equal(f.made[0].text, bank.posts[0].caption); assert.equal(f.made[1].text, bank.posts[0].caption);
  assert.equal(f.made[0].assets.length, 3); assert.equal(f.made[0].metadata.instagram.type, 'post', 'a carousel is a post with several images'); assert.equal(f.made[1].metadata.facebook.type, 'post');
  assert.match(f.made[0].assets[0].image.url, /^https:\/\/peacebestillapp\.com\/social\/ig\/p1-1\.png\?v=[0-9a-f]{8}$/);
  assert.ok(f.made[0].assets[0].image.metadata.altText.includes('Hush Harbor'));
  assert.equal(f.made[4].metadata.instagram.type, 'post', 'p2 is a single picture');
  assert.equal(r.queued, 6);
  assert.ok(lines.includes(`OUTPUT: queued 6 (instagram 3, facebook 3), scheduled ahead 6, bank unposted ${bank.posts.length - 3}, recycled 0 (${SPLIT})`), lines.join(' | '));
  assert.equal(Object.keys(JSON.parse(fs.readFileSync(ledgerFile, 'utf8')).posts).length, 3);
  const m = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
  assert.equal(m.channels.instagram.posts_sent, 1); assert.equal(m.channels.facebook.posts_sent, 0);
  assert.equal(m.channels.instagram.followers, 'not read'); assert.ok(m.channels.instagram.followers_why);
  assert.equal(m.first_post_at, '2026-11-19', 'first post = the first loop post Buffer sent, in Central time');
});
await check('only free room is taken; others\' posts are never touched', async () => {
  const others = Array.from({ length: 8 }, (_, i) => ({ id: `t${i}`, channelId: 'th', dueAt: '2026-11-21T03:30:00.000Z' }));
  const f = fakeBuffer({ channels: [th, ig, fb], scheduled: others });
  const { e, lines } = await run({ fetchImpl: f.fetchImpl });
  assert.ok(!e, e?.message);
  assert.equal(f.made.length, 2);
  assert.ok(lines.some((l) => l.startsWith('NAMED NOTE IG_ORG_LIMIT 4 post(s)')), lines.join(' | '));
});
await check('the Reel goes as a Reel, and falls back to the picture when Buffer refuses it', async () => {
  const reelPost = bank.posts.find((p) => p.reel);
  const small = path.join(tmp, 'bank.json');
  fs.writeFileSync(small, JSON.stringify({ ...bank, posts: [reelPost, ...bank.posts.filter((p) => p !== reelPost)] }));
  const ok = fakeBuffer({ channels: [ig, fb] });
  assert.ok(!(await run({ bankFile: small, fetchImpl: ok.fetchImpl })).e);
  assert.equal(ok.made[0].metadata.instagram.type, 'reel'); assert.equal(ok.made[0].metadata.instagram.isAiGenerated, true);
  assert.match(ok.made[0].assets[0].video.url, /p4-reel\.mp4$/); assert.equal(ok.made[0].text, reelPost.reel.caption);
  const no = fakeBuffer({ channels: [ig, fb], refuseReel: true });
  const { e, lines } = await run({ bankFile: small, fetchImpl: no.fetchImpl });
  assert.ok(!e, e?.message);
  assert.equal(no.made[0].assets[0].image ? 'image' : 'video', 'image'); assert.equal(no.made[0].text, reelPost.caption);
  assert.ok(lines.some((l) => l.startsWith('NAMED NOTE IG_REEL_FELL_BACK')), lines.join(' | '));
});
await check('a post Buffer failed to publish is red once', async () => {
  const ledgerFile = path.join(tmp, 'failed.json');
  fs.writeFileSync(ledgerFile, JSON.stringify({ posts: { p1: { runs: [{ channel: 'instagram', buffer_id: 'x9', due_at: '2026-11-17T02:00:00.000Z' }] } } }));
  const f = fakeBuffer({ channels: [ig, fb], errors: [{ id: 'x9', channelId: 'ig', error: { message: 'media rejected' } }] });
  assert.equal((await run({ ledgerFile, fetchImpl: f.fetchImpl })).e?.code, 'IG_PUBLISH_FAILED');
  assert.ok(!(await run({ ledgerFile, fetchImpl: f.fetchImpl })).e, 'the same failure is red again');
});
fs.rmSync(tmp, { recursive: true, force: true });

// 7. one switch, no ids
await check('the Buffer token is one switch and no Buffer id is in the repo', () => {
  for (const wf of ['.github/workflows/threads-posts.yml', '.github/workflows/instagram-posts.yml']) {
    const y = fs.readFileSync(wf, 'utf8');
    assert.ok(y.includes(`${TOKEN_ENV}: \${{ secrets.${TOKEN_ENV} }}`), `${wf} does not pass secrets.${TOKEN_ENV}`);
  }
  const files = ['scripts/threads', 'scripts/instagram', 'data/instagram', 'data/threads', 'data/social', '.github/workflows'].flatMap((d) => (fs.existsSync(d) ? fs.readdirSync(d).map((f) => path.join(d, f)) : []));
  // The ledgers (posted.json) hold Buffer POST ids by design; organisation and channel ids never.
  for (const f of files) if (fs.statSync(f).isFile() && !f.endsWith('posted.json')) assert.ok(!/\b[0-9a-f]{24}\b/.test(fs.readFileSync(f, 'utf8')), `${f} holds a 24-hex Buffer id`);
});

if (fails.length) { console.error(`[validate:instagram-loop] FAIL\n- ${fails.join('\n- ')}`); process.exit(1); }
console.log(`[validate:instagram-loop] OK - ${bank.posts.length} posts, ${Object.keys(lock.frames).length} pictures, every verse word for word, faith-only, loop and stops proven`);
