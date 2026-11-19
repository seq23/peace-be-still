// The Peace Be Still picture-post job (.github/workflows/instagram-posts.yml): one picture post
// (single, carousel, or the approved Psalm 4 Reel) every Sun, Tue and Thu at 20:00 America/Chicago,
// the SAME pictures and caption to Instagram @peacebestillapp and the Facebook Page "Peace Be Still",
// through Peace Be Still's own free Buffer (TOKEN_ENV in scripts/threads/buffer.mjs).
// Her yes 18 Nov 2026 to the plan and the 9 samples: "yes to the IG samples"
// (https://claude.ai/artifact/FQW2wm78JkZ2n5XeWJChct). Same shape as scripts/threads/threads_loop.mjs.
//
// Every run keeps the next 3 slots queued on each channel (customScheduled), within the Buffer
// organisation's 10 scheduled posts: this job keeps at most 6 (ORG_SPLIT.pictures), Threads 4,
// and it only ever takes room that is free (it never cancels a post). Posts come from
// data/instagram/posts.json in order; each queued post is recorded in data/instagram/posted.json.
// Channels are matched by service AND exact name, never "the first channel of a service".
//
// Uninterruptible past the bank: once every post has gone out, a slot takes the oldest-posted
// evergreen post not run in 60+ days (if none, the oldest anyway: NAMED NOTE IG_RECYCLE_UNDER_60);
// NAMED NOTE IG_BANK_LOW under 9 unposted. At queue time every post is re-checked (igProblems):
// verses word for word (KJV / RV1909) in the caption and on the pictures, faith only, the banned
// lists, the AI line, Young Faith's age line, hashtags, store wording, no italic verse words, the
// picture matching its post (frames.lock.json) and opening on peacebestillapp.com. A post that
// fails is held back and the run ends red with NAMED STOP IG_CONTENT_BLOCKED (others still go).
//
// Notes (green; the next run retries): IG_CHANNEL_NOT_CONNECTED <channel>, IG_ORG_LIMIT,
// IG_REEL_FELL_BACK (Buffer refused the Reel, the picture went instead), IG_BANK_LOW,
// IG_RECYCLE_UNDER_60, IG_POST_VANISHED. Named stops (red): SECRET_MISSING_<TOKEN_ENV>,
// BUFFER_ORG_AMBIGUOUS, AMBIGUOUS_IG_CHANNEL, IG_QUEUE_PAUSED, IG_CONTENT_BLOCKED,
// IG_PUBLISH_FAILED (Buffer says a post of ours failed to publish), IG_NOTHING_QUEUED, and the
// Buffer client's BUFFER_TOKEN_REFUSED / BUFFER_READ_FAILED / BUFFER_POST_REFUSED.
// Rule 0: every run prints `OUTPUT: queued N (instagram I, facebook F), scheduled ahead M, bank unposted K, recycled R (Buffer split ...)`.
//
// It also writes data/social/metrics.json (scorecard row pbs-social in Boss OS): posts sent per
// channel and 28-day views from Buffer, follower counts "not read" (Buffer's API has none), and
// 28-day site visits per channel from the site's own counter (GET /api/social-visits).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NamedStop, ORG_SPLIT, TOKEN_ENV, bufferClient, createPost, findOrganization, pendingPosts } from '../threads/buffer.mjs';
import { FAITH_ONLY, SPLIT, contentProblems, ctDate, quotedVerses, slotUtc, storeLive } from '../threads/threads_loop.mjs';
import { NEVER, MINDSET, PROMISE, REDLINE, DIALECT } from '../content/rules.mjs';
import { BOOK } from '../content/lib.mjs';
import { BASE_URL, SITE_DIR, frameHash, frameHtml, frameText, postFrames } from './frames.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const BANK_FILE = path.join(ROOT, 'data', 'instagram', 'posts.json');
export const LEDGER_FILE = path.join(ROOT, 'data', 'instagram', 'posted.json');
export const LOCK_FILE = path.join(ROOT, 'data', 'instagram', 'frames.lock.json');
export const THREADS_LEDGER_FILE = path.join(ROOT, 'data', 'threads', 'posted.json');
export const METRICS_FILE = path.join(ROOT, 'data', 'social', 'metrics.json');
export const STORE_FILE = path.join(ROOT, 'site', 'config', 'store.json');
/** The two picture channels, matched by service AND exact name. */
export const CHANNELS = [
  { key: 'instagram', service: 'instagram', name: 'peacebestillapp' },
  { key: 'facebook', service: 'facebook', name: 'Peace Be Still' },
];
export const THREADS_CHANNEL = { key: 'threads', service: 'threads', name: 'peacebestillapp' };
const TZ = 'America/Chicago';
const DAY = 86_400_000;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const HH_FULL = 'Hush Harbor · Black Bible Chat & Stories';
export const HH_AI = /Hush Harbor(?: · Black Bible Chat & Stories)? is AI/;

// ---- content checks -----------------------------------------------------------------------
export const TAGS_ALLOWED = new Set(['#blackbiblechat', '#biblestorieswithblackfaces', '#kjv', '#psalms', '#biblebeforebed', '#biblestories', '#prayer', '#christianwomen', '#christianteens', '#morningprayer', '#scripture', '#christianapp', '#bibliaenespañol', '#reinavalera1909', '#versiculodeldia']);
export const igTags = (lang) => (tags) => {
  if (tags.length < 3 || tags.length > 5) return `3 to 5 hashtags (got ${tags.length})`;
  if (tags[0] !== '#blackbiblechat') return `first hashtag must be #blackbiblechat (got ${tags[0]})`;
  const second = lang === 'es' ? '#bibliaenespañol' : '#biblestorieswithblackfaces';
  if (tags[1] !== second) return `second hashtag must be ${second} (got ${tags[1]})`;
  const odd = tags.filter((t) => !TAGS_ALLOWED.has(t.toLowerCase()));
  return odd.length ? `hashtags not on the approved list: ${odd.join(' ')}` : null;
};

/** The caption that goes out: "coming soon" until the App Store link is set, then "Free on iPhone". */
export function igStoreText(text, store) {
  if (!storeLive(store)) return text;
  return text.replace(/Coming soon to iPhone/g, 'Free on iPhone').replace(/coming soon to iPhone/g, 'free on iPhone').replace(/Muy pronto en iPhone/g, 'Gratis en iPhone');
}

/** Facebook posts carry a clickable link tagged utm_source=facebook (Instagram captions cannot hold a
 *  link; its bio link is peacebestillapp.com/?utm_source=instagram). The link goes just above the hashtags. */
export const FB_LINK = 'peacebestillapp.com/?utm_source=facebook';
export function fbText(text) {
  const t = text.replace(/, link in bio\./g, '.');
  const i = t.lastIndexOf('\n#');
  return i < 0 ? `${t}\n\n${FB_LINK}` : `${t.slice(0, i)}\n${FB_LINK}${t.slice(i)}`;
}

/** No italic verse words: in the King James, italics mark words the translators added. */
export function italicProblem(html) {
  const css = html.replace(/@font-face\s*\{[^}]*\}/g, '');
  if (/<i[\s>]|font-style:\s*italic/i.test(css)) return 'italic text on a picture';
  if (/<em>/.test(css) && !/\.verse em\{font-style:normal/.test(css)) return 'highlighted verse words are not upright';
  return null;
}

const LISTS = { NEVER, MINDSET, PROMISE, REDLINE, DIALECT };
/** Every reason this post must not go out. Empty = fine. Checks captions and pictures, never the network. */
export function igProblems(post, store, lock = null) {
  const out = [];
  const live = storeLive(store);
  const captions = [['caption', post.caption], ...(post.reel ? [['reel caption', post.reel.caption]] : [])];
  const capVerses = new Set();
  for (const [what, raw] of captions) {
    const text = igStoreText(raw ?? '', store);
    for (const p of contentProblems({ lang: post.lang, type: post.kind }, text, store, { tagRule: igTags(post.lang), maxChars: 2200 })) out.push(`${what}: ${p}`);
    for (const v of quotedVerses(text)) capVerses.add(`${v.book} ${v.ch}:${v.v}`);
    if (live && /muy pronto/i.test(text)) out.push(`${what}: says muy pronto though the store link is set`);
    if (!live && !/coming soon|muy pronto/i.test(text)) out.push(`${what}: no "coming soon" / "muy pronto"`);
    if (/Hush Harbor|Mi Refugio|Young Faith|whisper|voice|\bvoz\b|Psalm Nights/i.test(text) && !/\bAI\b|\bIA\b/.test(text)) out.push(`${what}: names an AI voice or chat without saying it is AI`);
    if (/Hush Harbor/.test(text) && !text.includes(HH_FULL)) out.push(`${what}: Hush Harbor without its full name "${HH_FULL}"`);
    if (/\p{Extended_Pictographic}/u.test(text)) out.push(`${what}: an emoji`);
  }
  const youngFaith = /^Young Faith/.test(post.frames[0]?.label ?? '');
  if (youngFaith && !post.caption.includes('No chat under 13')) out.push('caption: Young Faith without "No chat under 13"');
  for (const { file, frame } of postFrames(post)) {
    let made;
    try { made = frameHtml(frame, { lang: post.lang, live }); } catch (e) { out.push(`${file}: ${e.message}`); continue; }
    const words = frameText(frame, post.lang, live);
    const faith = words.match(FAITH_ONLY);
    if (faith) out.push(`${file}: faith-only block "${faith[0]}"`);
    for (const [name, re] of Object.entries(LISTS)) { const m = words.match(re); if (m) out.push(`${file}: ${name} "${m[0]}"`); }
    if (/\p{Extended_Pictographic}/u.test(words)) out.push(`${file}: an emoji`);
    const it = italicProblem(made.html);
    if (it) out.push(`${file}: ${it}`);
    if (youngFaith && file.endsWith('-1') && !words.includes('No chat under 13')) out.push(`${file}: Young Faith picture without "No chat under 13"`);
    for (const ref of made.verses) {
      const [code, cv] = ref.split(' ');
      const cite = `${post.lang === 'es' ? BOOK[code].es : BOOK[code].en} ${cv}`;
      if (!capVerses.has(cite)) out.push(`${file}: the picture's verse ${cite} is not quoted in the caption`);
    }
    if (lock) {
      const want = frameHash(frame, post.lang, live);
      if (lock.frames?.[file]?.hash !== want) out.push(`${file}: the picture does not match its post${live ? ' or the store state' : ''}; run npm run ig:render`);
    }
  }
  return out;
}

// ---- time: Sun / Tue / Thu at 20:00 America/Chicago -----------------------------------------
const dayFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' });
/** The next `posts_ahead` slots on the bank's weekdays, today's only if 15+ minutes away. */
export function slotsAhead(now, { slot_time_ct: hhmm = '20:00', weekdays_ct: days = ['Sun', 'Tue', 'Thu'], posts_ahead: n = 3 } = {}) {
  const today = ctDate(new Date(now).toISOString());
  const [y, m, d] = today.split('-').map(Number);
  const out = [];
  for (let i = 0; out.length < n && i < 30; i += 1) {
    const date = new Date(Date.UTC(y, m - 1, d + i, 12)).toISOString().slice(0, 10);
    const dueAt = slotUtc(date, hhmm);
    if (!days.includes(dayFmt.format(new Date(dueAt)))) continue;
    if (Date.parse(dueAt) - now < 15 * 60_000) continue;
    out.push({ date, dueAt, day: WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()] });
  }
  return out;
}

// ---- the plan for one run -----------------------------------------------------------------
const runsOf = (ledger, id) => ledger.posts?.[id]?.runs ?? [];
const lastRun = (ledger, id) => runsOf(ledger, id).map((r) => r.due_at).sort().at(-1) ?? null;
export const unposted = (bank, ledger) => bank.posts.filter((p) => !runsOf(ledger, p.id).length);

/**
 * Which post goes in each slot, and which channel still needs it. Pure.
 * pending: [{ channelKey, dueAt }] of OUR waiting posts; channels: the connected channel keys in
 * priority order; room: how many posts this run may create (org free room, capped by ORG_SPLIT).
 */
export function planRun({ bank, ledger, pending, now, room, channels, store, lock }) {
  const notes = [];
  const blocked = [];
  const bad = new Set();
  const used = new Set();
  const byId = new Map(bank.posts.map((p) => [p.id, p]));
  const onDate = new Map();
  for (const [id, v] of Object.entries(ledger.posts ?? {})) for (const r of v.runs ?? []) if (byId.has(id)) onDate.set(ctDate(r.due_at), id);
  const gapMs = (bank.recycle_after_days ?? 60) * DAY;
  const usable = (post) => {
    if (used.has(post.id) || bad.has(post.id)) return false;
    const problems = igProblems(post, store, lock);
    if (problems.length) { bad.add(post.id); blocked.push(`${post.id} (${problems.join('; ')})`); return false; }
    return true;
  };
  const jobs = [];
  for (const slot of slotsAhead(now, bank)) {
    const need = channels.filter((c) => !pending.some((p) => p.channelKey === c && p.dueAt && ctDate(p.dueAt) === slot.date));
    if (!need.length) { if (onDate.has(slot.date)) used.add(onDate.get(slot.date)); continue; }
    let post = onDate.has(slot.date) ? byId.get(onDate.get(slot.date)) : null;
    let recycled = false;
    if (post && !usable(post)) post = null;
    if (!post) {
      const evergreen = bank.posts.filter((p) => p.evergreen && lastRun(ledger, p.id)).sort((a, b) => lastRun(ledger, a.id).localeCompare(lastRun(ledger, b.id)));
      const due = evergreen.filter((p) => Date.parse(slot.dueAt) - Date.parse(lastRun(ledger, p.id)) >= gapMs);
      post = unposted(bank, ledger).find(usable) ?? null;
      if (!post) { post = due.find(usable) ?? null; recycled = Boolean(post); }
      if (!post) {
        post = evergreen.find((p) => !due.includes(p) && usable(p)) ?? null;
        if (post) { recycled = true; notes.push(`IG_RECYCLE_UNDER_60 ${post.id} on ${slot.date}: no evergreen post was 60+ days old; add posts to data/instagram/posts.json`); }
      }
    }
    if (!post) { notes.push(`IG_NO_POST_FOR ${slot.date}: every post was blocked or used this run`); continue; }
    used.add(post.id);
    for (const c of need) jobs.push({ post, slot, channel: c, recycled });
  }
  const take = jobs.slice(0, Math.max(0, room));
  if (take.length < jobs.length) notes.push(`IG_ORG_LIMIT ${jobs.length - take.length} post(s) left unqueued: the Peace Be Still Buffer has no free room (10 scheduled posts: this job keeps up to ${ORG_SPLIT.pictures}, Threads ${ORG_SPLIT.threads}; nothing is ever cancelled); the next run fills them`);
  return { jobs: take, notes, blocked };
}

/** The one channel with this service AND exact name: null when not connected, a named stop when several. */
export function pickChannel(channels, { service, name }) {
  const hits = (channels ?? []).filter((c) => c.service === service && String(c.name ?? '') === name);
  if (hits.length > 1) throw new NamedStop('AMBIGUOUS_IG_CHANNEL', `${hits.length} ${service} channels are named "${name}" in Buffer; refusing to guess which one to post to`);
  return hits[0] ?? null;
}

const imageUrl = (file, lock) => `${BASE_URL}/${SITE_DIR}/${file}.png?v=${(lock.frames?.[file]?.hash ?? '0').slice(0, 8)}`;

/** The createPost input for one channel: the picture(s), or the Reel. */
export function postInput({ post, channel, channelId, dueAt, text, lock, reel = false }) {
  const base = { channelId, text: channel === 'facebook' ? fbText(text) : text, mode: 'customScheduled', dueAt, schedulingType: 'automatic', needsApproval: false, source: 'pbs-picture-loop' };
  if (reel) {
    const video = { url: `${BASE_URL}/${SITE_DIR}/${post.reel.video}`, thumbnailUrl: imageUrl(`${post.id}-reel`, lock) };
    const metadata = channel === 'instagram' ? { instagram: { type: 'reel', shouldShareToFeed: true, isAiGenerated: true } } : { facebook: { type: 'reel' } };
    return { ...base, assets: [{ video }], metadata };
  }
  // A carousel is an Instagram 'post' with several images (Buffer refuses type 'carousel', 19 Nov 2026).
  const frames = postFrames({ ...post, reel: undefined });
  const assets = frames.map(({ file, frame }) => ({ image: { url: imageUrl(file, lock), metadata: { altText: frameText(frame, post.lang).slice(0, 500) } } }));
  const metadata = channel === 'instagram' ? { instagram: { type: 'post', shouldShareToFeed: true } } : { facebook: { type: 'post' } };
  return { ...base, assets, metadata };
}

/** Every picture (and the Reel video) this post needs answers 200 with the right type on the live site. */
export async function mediaProblem(post, lock, fetchImpl) {
  const urls = postFrames(post).map(({ file }) => [imageUrl(file, lock), 'image/png']);
  if (post.reel) urls.push([`${BASE_URL}/${SITE_DIR}/${post.reel.video}`, 'video/mp4']);
  for (const [url, type] of urls) {
    let res;
    try { res = await fetchImpl(url, { method: 'HEAD' }); } catch (e) { return `${url} unreachable: ${e.message}`; }
    const ct = res.headers?.get?.('content-type') ?? '';
    if (res.status !== 200 || !ct.startsWith(type)) return `${url} answered ${res.status} ${ct || '(no type)'}`;
  }
  return null;
}

// ---- metrics for the scorecard row pbs-social ------------------------------------------------
export async function readMetrics({ call, orgId, chans, ledgers, now }) {
  const out = { channels: {} };
  let sent = [];
  let sentWhy = null;
  try {
    let after = null;
    for (let page = 0; page < 20; page += 1) {
      const { posts } = await call(`query($o:OrganizationId!,$a:String){ posts(first:100, after:$a, input:{organizationId:$o, filter:{status:[sent]}}){ edges { node { id channelId sentAt } } pageInfo { hasNextPage endCursor } } }`, { o: orgId, a: after });
      sent.push(...(posts?.edges ?? []).map((e) => e.node));
      if (!posts?.pageInfo?.hasNextPage) break;
      after = posts.pageInfo.endCursor;
    }
  } catch (e) { sent = null; sentWhy = `Buffer posts read failed: ${e.message}`; }
  for (const c of [...CHANNELS, THREADS_CHANNEL]) {
    const ch = chans[c.key];
    const row = { name: `${c.service} ${c.name}`, followers: 'not read', followers_why: 'Buffer\'s API has no follower count; read by hand in the app' };
    if (!ch) { row.posts_sent = 'not read'; row.posts_sent_why = 'channel not connected in Buffer'; row.views_28d = 'not read'; row.views_28d_why = 'channel not connected in Buffer'; out.channels[c.key] = row; continue; }
    if (sent) row.posts_sent = sent.filter((p) => p.channelId === ch.id).length; else { row.posts_sent = 'not read'; row.posts_sent_why = sentWhy; }
    try {
      const { aggregatedPostMetrics: m } = await call('query($o:OrganizationId!,$s:DateTime!,$e:DateTime!,$c:[ChannelId!]){ aggregatedPostMetrics(input:{organizationId:$o,startDateTime:$s,endDateTime:$e,channelIds:$c}){ metrics{ type value } } }', { o: orgId, s: new Date(now - 28 * DAY).toISOString(), e: new Date(now).toISOString(), c: [ch.id] });
      const v = m?.metrics?.find((x) => x.type === 'views');
      if (v && Number.isFinite(v.value)) row.views_28d = v.value; else { row.views_28d = 'not read'; row.views_28d_why = 'Buffer returned no views metric'; }
    } catch (e) { row.views_28d = 'not read'; row.views_28d_why = `Buffer metrics read failed: ${e.message}`; }
    out.channels[c.key] = row;
  }
  const ours = new Set(ledgers.flatMap((l) => Object.values(l.posts ?? {}).flatMap((v) => (v.runs ?? []).map((r) => r.buffer_id))));
  const first = (sent ?? []).filter((p) => ours.has(p.id) && p.sentAt).map((p) => p.sentAt).sort()[0] ?? null;
  out.first_post_at = first ? ctDate(first) : null;
  return out;
}

/** 28-day page views per channel, counted by the site (GET /api/social-visits; D1 table social_visits). */
export async function readSocialVisits(fetchImpl) {
  try {
    const res = await fetchImpl(`${BASE_URL}/api/social-visits?days=28`);
    if (res.status !== 200) return { why: `${BASE_URL}/api/social-visits answered ${res.status}` };
    const body = await res.json();
    const sources = body?.sources ?? {};
    if (![THREADS_CHANNEL, ...CHANNELS].every((c) => Number.isFinite(sources[c.key])) || !Number.isFinite(body.total)) return { why: '/api/social-visits answered without a count per channel' };
    return { total: body.total, sources, counting_since: body.counting_since ?? null };
  } catch (e) { return { why: `/api/social-visits unreachable: ${e.message}` }; }
}

export function writeMetrics(file, m, now) {
  const prev = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const doc = {
    _comment: 'Written by scripts/instagram/ig_loop.mjs every run; read by the Boss OS scorecard row pbs-social. "not read" always comes with a _why.',
    updatedAt: new Date(now).toISOString(),
    first_post_at: m.first_post_at ?? prev.first_post_at ?? null,
    ...(Number.isFinite(m.visits?.total)
      ? { social_visits_28d: m.visits.total, social_visits_counting_since: m.visits.counting_since }
      : { social_visits_28d: 'not read', social_visits_28d_why: m.visits?.why ?? 'social visits were not read this run' }),
    social_store_visits_28d: 'not read',
    social_store_visits_28d_why: 'the App Store link is not set yet (site/config/store.json), so there are no store-page visits to count',
    channels: m.channels ?? prev.channels ?? {},
  };
  for (const [key, row] of Object.entries(doc.channels)) {
    delete row.visits_28d; delete row.visits_28d_why;
    if (Number.isFinite(m.visits?.sources?.[key])) row.visits_28d = m.visits.sources[key];
    else { row.visits_28d = 'not read'; row.visits_28d_why = m.visits?.why ?? 'social visits were not read this run'; }
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(doc, null, 2)}\n`);
}

// ---- the run ------------------------------------------------------------------------------
const readJson = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
export async function main({ now = Date.now(), env = process.env, fetchImpl = fetch, log = console.log, bankFile = BANK_FILE, ledgerFile = LEDGER_FILE, storeFile = STORE_FILE, lockFile = LOCK_FILE, metricsFile = METRICS_FILE, threadsLedgerFile = THREADS_LEDGER_FILE } = {}) {
  const writeLedger = (l) => fs.writeFileSync(ledgerFile, `${JSON.stringify(l, null, 2)}\n`);
  const summary = (lines) => { if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `### Instagram + Facebook pictures\n\n${lines.map((l) => `- ${l}`).join('\n')}\n`); };
  const bank = readJson(bankFile, null);
  const ledger = readJson(ledgerFile, { posts: {} });
  ledger.posts ??= {};
  ledger.failed_seen ??= [];
  const store = readJson(storeFile, {});
  const lock = readJson(lockFile, { frames: {} });
  const token = env[TOKEN_ENV];
  if (!token) throw new NamedStop(`SECRET_MISSING_${TOKEN_ENV}`, `${TOKEN_ENV} is not set (repository secret; from the Boss OS vault)`);
  const call = bufferClient(token, fetchImpl, TOKEN_ENV);
  const org = await findOrganization(call);
  const { channels } = await call('query($o:OrganizationId!){ channels(input:{organizationId:$o}){ id service name isQueuePaused } }', { o: org.id });
  const chans = {};
  for (const c of [...CHANNELS, THREADS_CHANNEL]) chans[c.key] = pickChannel(channels, c);
  const notes = [];
  const live = CHANNELS.filter((c) => chans[c.key]);
  for (const c of CHANNELS) if (!chans[c.key]) notes.push(`IG_CHANNEL_NOT_CONNECTED no ${c.service} channel named "${c.name}" in the Peace Be Still Buffer; its posts wait, the next run retries`);
  for (const c of live) if (chans[c.key].isQueuePaused) throw new NamedStop('IG_QUEUE_PAUSED', `the ${c.service} "${c.name}" queue is paused in Buffer, so nothing scheduled goes out: unpause it`);

  const all = await pendingPosts(call, org.id, 'id channelId dueAt');
  const keyOf = new Map(live.map((c) => [chans[c.key].id, c.key]));
  const pending = all.filter((p) => keyOf.has(p.channelId)).map((p) => ({ ...p, channelKey: keyOf.get(p.channelId) }));

  // A queued run whose Buffer post vanished before its time (deleted) is forgotten, so it can go again.
  const ids = new Set(pending.map((p) => p.id));
  for (const [id, v] of Object.entries(ledger.posts)) {
    const keep = (v.runs ?? []).filter((r) => Date.parse(r.due_at) <= now || ids.has(r.buffer_id));
    if (keep.length !== (v.runs ?? []).length) { notes.push(`IG_POST_VANISHED ${id}: its Buffer post is gone before its time; it will be queued again`); v.runs = keep; }
  }

  // Posts of ours that Buffer could not publish: red once per post, so someone looks the same morning.
  const failed = [];
  if (live.length) {
    const { posts } = await call('query($o:OrganizationId!){ posts(first:100, input:{organizationId:$o, filter:{status:[error]}}){ edges { node { id channelId error { message } } } } }', { o: org.id });
    const ours = new Set(Object.values(ledger.posts).flatMap((v) => (v.runs ?? []).map((r) => r.buffer_id)));
    for (const { node } of posts?.edges ?? []) if (ours.has(node.id) && !ledger.failed_seen.includes(node.id)) { failed.push(`${node.id} (${node.error?.message ?? 'no reason given'})`); ledger.failed_seen.push(node.id); }
  }

  const room = Math.min(Number(org.limits?.scheduledPosts ?? 10) - all.length, ORG_SPLIT.pictures - pending.length);
  const plan = live.length ? planRun({ bank, ledger, pending, now, room, channels: live.map((c) => c.key), store, lock }) : { jobs: [], notes: [], blocked: [] };
  notes.push(...plan.notes);
  const blocked = [...plan.blocked];
  const metrics = async () => {
    const visits = await readSocialVisits(fetchImpl);
    try {
      writeMetrics(metricsFile, { visits, ...await readMetrics({ call, orgId: org.id, chans, ledgers: [ledger, readJson(threadsLedgerFile, { posts: {} })], now }) }, now);
    } catch (e) {
      writeMetrics(metricsFile, { visits }, now);
      notes.push(`IG_METRICS_NOT_READ ${e.message.slice(0, 200)}`);
    }
  };
  const mediaChecked = new Map();
  const count = { instagram: 0, facebook: 0 };
  let recycled = 0;
  try {
  for (const { post, slot, channel, recycled: re } of plan.jobs) {
    if (!mediaChecked.has(post.id)) mediaChecked.set(post.id, await mediaProblem(post, lock, fetchImpl));
    const media = mediaChecked.get(post.id);
    if (media) { if (!blocked.some((b) => b.startsWith(`${post.id} `))) blocked.push(`${post.id} (picture does not open: ${media})`); continue; }
    const text = igStoreText(post.caption, store);
    let made;
    let format = postFrames({ ...post, reel: undefined }).length > 1 ? 'carousel' : 'single';
    if (post.reel) {
      try {
        made = await createPost(call, postInput({ post, channel, channelId: chans[channel].id, dueAt: slot.dueAt, text: igStoreText(post.reel.caption, store), lock, reel: true }));
        format = 'reel';
      } catch (e) {
        if (e.code !== 'BUFFER_POST_REFUSED') throw e;
        notes.push(`IG_REEL_FELL_BACK ${post.id} on ${channel}: Buffer refused the Reel (${e.message.slice(0, 160)}); the picture went instead`);
      }
    }
    made ??= await createPost(call, postInput({ post, channel, channelId: chans[channel].id, dueAt: slot.dueAt, text, lock }));
    ledger.posts[post.id] = { runs: [...runsOf(ledger, post.id), { channel, buffer_id: made.id, due_at: made.dueAt ?? slot.dueAt, queued_at: new Date(now).toISOString(), recycled: re, format }] };
    writeLedger(ledger);
    count[channel] += 1;
    if (re) recycled += 1;
    log(`queued ${post.id} (${format}${re ? ', recycled' : ''}) on ${channel} for ${slot.day} ${slot.date} 20:00 CT`);
  }
  } catch (e) { writeLedger(ledger); await metrics(); throw e; }
  writeLedger(ledger);
  const queued = count.instagram + count.facebook;
  const ahead = pending.filter((p) => p.dueAt && Date.parse(p.dueAt) > now).length + queued;
  const left = unposted(bank, ledger).length;
  if (left < (bank.bank_low_below ?? 9)) notes.push(`IG_BANK_LOW ${left} unposted left in data/instagram/posts.json; recycling keeps posting, add new approved posts`);

  await metrics();

  for (const n of notes) log(`NAMED NOTE ${n}`);
  const output = `OUTPUT: queued ${queued} (instagram ${count.instagram}, facebook ${count.facebook}), scheduled ahead ${ahead}, bank unposted ${left}, recycled ${recycled} (${SPLIT})`;
  log(output);
  summary([output, ...notes.map((n) => `NAMED NOTE ${n}`)]);
  if (failed.length) throw new NamedStop('IG_PUBLISH_FAILED', `Buffer could not publish: ${failed.join('; ')}. Look at the post in Buffer; the loop keeps queueing the rest`);
  if (blocked.length) throw new NamedStop('IG_CONTENT_BLOCKED', `${blocked.join('; ')}: fix it in data/instagram/posts.json or re-render (the others were queued)`);
  const want = live.length * (bank.posts_ahead ?? 3);
  if (live.length && !queued && ahead < want && !notes.length) throw new NamedStop('IG_NOTHING_QUEUED', `0 queued and only ${ahead} of ${want} scheduled ahead, with no reason found`);
  return { queued, count, ahead, left, recycled, notes };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => {
    if (e instanceof NamedStop) { console.error(`NAMED STOP: ${e.message}`); process.exit(1); }
    throw e;
  });
}
