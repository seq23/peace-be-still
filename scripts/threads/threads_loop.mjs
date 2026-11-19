// The daily Peace Be Still Threads job (.github/workflows/threads-posts.yml): one post a day at
// 21:30 America/Chicago on Threads @peacebestillapp, through ApprovalPrep's free Buffer
// (BUFFER_APPROVALPREP_ACCESS_TOKEN). That organisation also holds Threads @approvalprep, so the
// channel is found by service "threads" AND name THREADS_CHANNEL_NAME, never by service alone.
// Her yes 18 Nov 2026 to the posts, version 5: "yes". Same shape as approvalprep's loop
// (approvalprep scripts/threads/threads_loop.mjs).
//
// Every run keeps the next 7 evening slots filled (customScheduled, dueAt 21:30 CT), within the
// organisation's scheduled-post limit (10 on the free plan, SHARED with @approvalprep's queue).
// Posts come from data/threads/posts.json in order; each run is recorded in data/threads/posted.json.
//
// Uninterruptible past the bank:
//   - recycling: once every bank post has gone out, the slot takes the oldest-posted evergreen
//     post that has not run in 60+ days (if none is, the oldest anyway, NAMED NOTE
//     THREADS_RECYCLE_UNDER_60); never two Question posts on consecutive days;
//   - NAMED NOTE THREADS_BANK_LOW when fewer than 14 unposted remain;
//   - NAMED NOTE THREADS_ORG_LIMIT when the shared organisation limit leaves fewer than 7 ahead;
//   - at queue time every post is re-checked (contentProblems): each quoted verse word for word
//     against content/bible (KJV, or RV1909 for Spanish), the repo's banned-word lists
//     (scripts/content/rules.mjs: never-words, Mindset/New Age words, outcome promises, theology
//     red lines, eye dialect), the faith-only block (no Mindset, Imagination Nights, manifesting
//     or law of assumption), one tag, under 500 characters, and the store wording below. A hit
//     hard-blocks the post; the others are queued and the run ends red with NAMED STOP
//     THREADS_CONTENT_BLOCKED.
//   - store wording (site/config/store.json): until app_store_url is set, posts say "coming soon"
//     and any "in the store" / "Free on iPhone" wording is blocked; once it is set, "coming soon"
//     becomes "Free on iPhone" (storeText).
//
// Until she connects @peacebestillapp in Buffer (it waits on Meta's security review) the run
// prints NAMED NOTE THREADS_CHANNEL_NOT_CONNECTED and exits green: it waits on her, and the next
// daily run retries.
//
// Rule 0: every run prints `OUTPUT: queued N, scheduled ahead M, bank unposted K, recycled R`.
// Zero queued with fewer than 7 ahead and no named note is NAMED STOP THREADS_NOTHING_QUEUED.
// Other named stops (red): SECRET_MISSING_BUFFER_APPROVALPREP_ACCESS_TOKEN,
// AMBIGUOUS_THREADS_CHANNEL, THREADS_QUEUE_PAUSED, THREADS_CONTENT_BLOCKED, and the Buffer
// client's BUFFER_TOKEN_REFUSED / BUFFER_READ_FAILED / BUFFER_POST_REFUSED.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NamedStop, bufferClient, createPost, pendingPosts } from './buffer.mjs';
import { BOOK, bible } from '../content/lib.mjs';
import { NEVER, MINDSET, PROMISE, REDLINE, DIALECT } from '../content/rules.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const BANK_FILE = path.join(ROOT, 'data', 'threads', 'posts.json');
export const LEDGER_FILE = path.join(ROOT, 'data', 'threads', 'posted.json');
export const STORE_FILE = path.join(ROOT, 'site', 'config', 'store.json');
export const TOKEN = 'BUFFER_APPROVALPREP_ACCESS_TOKEN';
/** The Buffer channel name of Threads @peacebestillapp. Never match on service alone. */
export const THREADS_CHANNEL_NAME = 'peacebestillapp';
export const LINK = 'peacebestillapp.com/?utm_source=threads';
export const TAG = '#ChristianThreads';
const TZ = 'America/Chicago';
const DAY = 86_400_000;

// ---- content checks (queue time and validator) --------------------------------------------
/** Faith only (her yes 18 Nov 2026): never the Mindset door on these accounts. */
export const FAITH_ONLY = /\bmindset\b|imagination\s+nights?|\bmanifest\w*|law\s+of\s+(?:assumption|attraction)|\bassum(?:e|ing)\s+the\s+feeling\b|\bneville\b|\bnoches\s+de\s+imaginaci[óo]n\b|\bmanifestar\w*/i;
const LIST_CHECKS = { NEVER, MINDSET, PROMISE, REDLINE, DIALECT };
const NAME_TO_CODE = new Map(Object.entries(BOOK).flatMap(([code, { en, es }]) => [[en.toLowerCase(), code], [es.toLowerCase(), code], ...(en === 'Psalm' ? [['psalms', code]] : [])]));
const norm = (s) => String(s).replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();

/** Every `"quote"` line followed by a `Book C:V` line. */
export function quotedVerses(text) {
  const lines = text.split('\n');
  const out = [];
  for (let i = 0; i + 1 < lines.length; i += 1) {
    const q = lines[i].match(/^["“](.+)["”]$/);
    const r = lines[i + 1].match(/^((?:[1-3] )?[A-Za-zÁÉÍÓÚáéíóúñ ]+?) (\d+):(\d+)$/);
    if (q && r) out.push({ quote: q[1], book: r[1], ch: r[2], v: r[3], line: i });
  }
  return out;
}

/** Where the post stands on a verse it quotes: null, or why it is not word for word. */
export function verseProblem(verse, lang) {
  const code = NAME_TO_CODE.get(verse.book.toLowerCase());
  if (!code) return `unknown book "${verse.book}"`;
  const tr = lang === 'es' ? 'RV1909' : 'KJV';
  const stored = bible(tr).get(`${code} ${verse.ch}:${verse.v}`);
  if (!stored) return `${verse.book} ${verse.ch}:${verse.v} is not in the ${tr} file`;
  return norm(stored) === norm(verse.quote) ? null : `${verse.book} ${verse.ch}:${verse.v} is not the ${tr} word for word`;
}

export const storeLive = (store) => Boolean(store?.app_store_url);

/** The text that goes out: "coming soon" until the App Store link is set, then "Free on iPhone". */
export function storeText(text, store) {
  if (!storeLive(store)) return text;
  return text.replace(/Coming to iPhone soon/g, 'Free on iPhone').replace(/Coming soon/g, 'Free on iPhone').replace(/coming soon/g, 'free on iPhone');
}

/** Every reason this post must not go out as `text`. Empty = fine. */
export function contentProblems(post, text, store) {
  const out = [];
  const verses = quotedVerses(text);
  for (const v of verses) { const p = verseProblem(v, post.lang); if (p) out.push(p); }
  if (/^["“].+["”]$/m.test(text) && !verses.length && post.type === 'Chat') out.push('a quoted verse with no reference under it');
  const lines = text.split('\n');
  const ours = lines.filter((_, i) => !verses.some((v) => v.line === i)).join('\n').replace(/[’‘]/g, "'");
  const faith = ours.match(FAITH_ONLY);
  if (faith) out.push(`faith-only block: "${faith[0]}"`);
  for (const [name, re] of Object.entries(LIST_CHECKS)) { const m = ours.match(re); if (m) out.push(`${name}: "${m[0]}"`); }
  const tags = text.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  if (tags.length !== 1 || tags[0] !== TAG) out.push(`tags must be exactly ${TAG} (got ${tags.join(' ') || 'none'})`);
  if (text.length >= 500) out.push(`${text.length} characters`);
  if (storeLive(store)) { if (/coming (?:to iphone )?soon/i.test(text)) out.push('says coming soon though the store link is set'); }
  else if (/\b(?:in|on) the (?:app )?store\b|\bfree on iphone\b|\bdownload (?:it )?(?:now|today)\b|\bavailable now\b|\bget it (?:now|today)\b/i.test(text)) out.push('store wording before the store link is set (say coming soon)');
  return out;
}

// ---- time: slots at 21:30 America/Chicago -------------------------------------------------
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
function ctParts(ms) {
  const p = Object.fromEntries(fmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}
export const ctDate = (iso) => ctParts(Date.parse(iso)).date;

/** The UTC instant of hh:mm Central on a Central calendar date (CST or CDT). */
export function slotUtc(date, hhmm) {
  const [y, m, d] = date.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  for (const off of [5, 6]) {
    const ms = Date.UTC(y, m - 1, d, h + off, mi);
    const p = ctParts(ms);
    if (p.date === date && p.time === hhmm) return new Date(ms).toISOString();
  }
  throw new Error(`no ${hhmm} on ${date} in ${TZ}`);
}

/** The next `days` evening slots, starting today if today's is still 15+ minutes away. */
export function slotsAhead(now, { slot_time_ct: hhmm = '21:30', days_ahead: days = 7 } = {}) {
  const today = ctParts(now).date;
  const [y, m, d] = today.split('-').map(Number);
  const start = Date.parse(slotUtc(today, hhmm)) - now >= 15 * 60_000 ? 0 : 1;
  const out = [];
  for (let i = start; out.length < days; i += 1) {
    const date = new Date(Date.UTC(y, m - 1, d + i, 12)).toISOString().slice(0, 10);
    out.push({ date, dueAt: slotUtc(date, hhmm) });
  }
  return out;
}

// ---- the plan for one run -----------------------------------------------------------------
const lastRun = (ledger, id) => (ledger.posts?.[id]?.runs ?? []).map((r) => r.due_at).sort().at(-1) ?? null;
export const unposted = (bank, ledger) => bank.posts.filter((p) => !(ledger.posts?.[p.id]?.runs ?? []).length);

/** Which post goes in each empty slot. Pure. pending: this channel's waiting posts; orgRoom: what the organisation still takes. */
export function planRun({ bank, ledger, pending, now, orgRoom, store }) {
  const taken = new Set(pending.filter((p) => p.dueAt).map((p) => ctDate(p.dueAt)));
  const open = slotsAhead(now, bank).filter((s) => !taken.has(s.date));
  const slots = open.slice(0, Math.max(0, orgRoom));
  const notes = [];
  if (slots.length < open.length) notes.push(`THREADS_ORG_LIMIT ${open.length - slots.length} evening(s) left unqueued: the ApprovalPrep Buffer organisation is at its scheduled-post limit (shared with @approvalprep); the next run fills them`);
  const typeOn = new Map();
  const byId = new Map(bank.posts.map((p) => [p.id, p]));
  for (const [id, v] of Object.entries(ledger.posts ?? {})) for (const r of v.runs ?? []) if (byId.has(id)) typeOn.set(ctDate(r.due_at), byId.get(id).type);
  const blocked = [];
  const bad = new Set();
  const used = new Set();
  const picks = [];
  const gapMs = (bank.recycle_after_days ?? 60) * DAY;

  function usable(post, slot) {
    if (used.has(post.id) || bad.has(post.id)) return false;
    const prev = new Date(Date.parse(`${slot.date}T12:00:00Z`) - DAY).toISOString().slice(0, 10);
    if (post.type === 'Question' && typeOn.get(prev) === 'Question') return false;
    const problems = contentProblems(post, storeText(post.text, store), store);
    if (problems.length) { bad.add(post.id); blocked.push(`${post.id} (${problems.join('; ')})`); return false; }
    return true;
  }

  for (const slot of slots) {
    const fresh = unposted(bank, ledger);
    const evergreen = bank.posts.filter((p) => p.evergreen && lastRun(ledger, p.id)).sort((a, b) => lastRun(ledger, a.id).localeCompare(lastRun(ledger, b.id)));
    const due = evergreen.filter((p) => Date.parse(slot.dueAt) - Date.parse(lastRun(ledger, p.id)) >= gapMs);
    let pick = fresh.find((p) => usable(p, slot)) ?? null;
    let recycled = false;
    if (!pick) { pick = due.find((p) => usable(p, slot)) ?? null; recycled = Boolean(pick); }
    if (!pick) {
      pick = evergreen.find((p) => !due.includes(p) && usable(p, slot)) ?? null;
      if (pick) { recycled = true; notes.push(`THREADS_RECYCLE_UNDER_60 ${pick.id} on ${slot.date}: no evergreen post was 60+ days old; add posts to data/threads/posts.json`); }
    }
    if (!pick) { notes.push(`THREADS_NO_POST_FOR ${slot.date}: every post was skipped, blocked or used this run`); continue; }
    used.add(pick.id);
    typeOn.set(slot.date, pick.type);
    picks.push({ post: pick, slot, recycled, text: storeText(pick.text, store) });
  }
  return { picks, notes, blocked, slotsOpen: slots.length };
}

/** The one Threads channel named `name`: null when not connected yet, a named stop when several. */
export function pickThreadsChannel(channels, name = THREADS_CHANNEL_NAME) {
  const hits = (channels ?? []).filter((c) => c.service === 'threads' && String(c.name ?? '').toLowerCase() === name.toLowerCase());
  if (hits.length > 1) throw new NamedStop('AMBIGUOUS_THREADS_CHANNEL', `${hits.length} Threads channels are named ${name} in Buffer; refusing to guess which one to post to`);
  return hits[0] ?? null;
}

/** The createPost input: a plain Threads text post at the slot's exact time. */
export function threadsInput(text, channelId, dueAt) {
  return { channelId, text, assets: [], metadata: { threads: { type: 'post' } }, mode: 'customScheduled', dueAt, schedulingType: 'automatic', needsApproval: false, source: 'pbs-threads-loop' };
}

const readJson = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
export async function main({ now = Date.now(), env = process.env, fetchImpl = fetch, log = console.log, bankFile = BANK_FILE, ledgerFile = LEDGER_FILE, storeFile = STORE_FILE } = {}) {
  const writeLedger = (l) => fs.writeFileSync(ledgerFile, `${JSON.stringify(l, null, 2)}\n`);
  const summary = (lines) => { if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `### Threads @peacebestillapp\n\n${lines.map((l) => `- ${l}`).join('\n')}\n`); };
  const bank = readJson(bankFile, null);
  const ledger = readJson(ledgerFile, { posts: {} });
  const store = readJson(storeFile, {});
  ledger.posts ??= {};
  const token = env[TOKEN];
  if (!token) throw new NamedStop(`SECRET_MISSING_${TOKEN}`, `${TOKEN} is not set (repository secret; from the Boss OS vault)`);
  const call = bufferClient(token, fetchImpl, TOKEN);
  const org = (await call('{ account { organizations { id limits { scheduledPosts } } } }'))?.account?.organizations?.[0];
  if (!org) throw new NamedStop('BUFFER_READ_FAILED', 'the token sees no Buffer organisation');
  const { channels } = await call('query($o:OrganizationId!){ channels(input:{organizationId:$o}){ id service name isQueuePaused } }', { o: org.id });
  const ch = pickThreadsChannel(channels);
  if (!ch) {
    const left = unposted(bank, ledger).length;
    const note = `THREADS_CHANNEL_NOT_CONNECTED no Threads channel named ${THREADS_CHANNEL_NAME} in the ApprovalPrep Buffer yet (waiting on Meta's security review, then she connects it); the next daily run retries`;
    const output = `OUTPUT: queued 0, scheduled ahead 0, bank unposted ${left}, recycled 0`;
    log(`NAMED NOTE ${note}`);
    log(output);
    summary([output, `NAMED NOTE ${note}`]);
    return { queued: 0, ahead: 0, left, recycled: 0, notes: [note] };
  }
  if (ch.isQueuePaused) throw new NamedStop('THREADS_QUEUE_PAUSED', 'the @peacebestillapp Threads queue is paused in Buffer, so nothing scheduled goes out: unpause it');
  const all = await pendingPosts(call, org.id, 'id channelId dueAt');
  const pending = all.filter((p) => p.channelId === ch.id);
  const notes = [];

  // A run whose Buffer post vanished before its time (deleted or failed) is forgotten, so the post can go again.
  const ids = new Set(pending.map((p) => p.id));
  for (const [id, v] of Object.entries(ledger.posts)) {
    const keep = (v.runs ?? []).filter((r) => Date.parse(r.due_at) <= now || ids.has(r.buffer_id));
    if (keep.length !== (v.runs ?? []).length) { notes.push(`THREADS_POST_VANISHED ${id}: its Buffer post is gone before its time; it will be queued again`); v.runs = keep; }
  }

  const orgRoom = Number(org.limits?.scheduledPosts ?? 10) - all.length;
  const plan = planRun({ bank, ledger, pending, now, orgRoom, store });
  notes.push(...plan.notes);
  let queued = 0;
  let recycled = 0;
  for (const { post, slot, recycled: re, text } of plan.picks) {
    const made = await createPost(call, threadsInput(text, ch.id, slot.dueAt));
    const runs = ledger.posts[post.id]?.runs ?? [];
    ledger.posts[post.id] = { runs: [...runs, { buffer_id: made.id, due_at: made.dueAt ?? slot.dueAt, queued_at: new Date(now).toISOString(), recycled: re }] };
    writeLedger(ledger);
    queued += 1;
    if (re) recycled += 1;
    log(`queued ${post.id} (${post.type}${re ? ', recycled' : ''}) for ${slot.date} 21:30 CT`);
  }
  if (!plan.picks.length) writeLedger(ledger);
  const ahead = pending.filter((p) => p.dueAt && Date.parse(p.dueAt) > now).length + queued;
  const left = unposted(bank, ledger).length;
  if (left < (bank.bank_low_below ?? 14)) notes.push(`THREADS_BANK_LOW ${left} unposted left in data/threads/posts.json; recycling keeps posting, add new approved posts`);
  for (const n of notes) log(`NAMED NOTE ${n}`);
  const output = `OUTPUT: queued ${queued}, scheduled ahead ${ahead}, bank unposted ${left}, recycled ${recycled}`;
  log(output);
  summary([output, ...notes.map((n) => `NAMED NOTE ${n}`)]);
  if (plan.blocked.length) throw new NamedStop('THREADS_CONTENT_BLOCKED', `${plan.blocked.join('; ')}: fix or delete it in data/threads/posts.json (the others were queued)`);
  if (!queued && ahead < (bank.days_ahead ?? 7) && !notes.length) throw new NamedStop('THREADS_NOTHING_QUEUED', `0 queued and only ${ahead} scheduled ahead, with no reason found`);
  return { queued, ahead, left, recycled, notes };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => {
    if (e instanceof NamedStop) { console.error(`NAMED STOP: ${e.message}`); process.exit(1); }
    throw e;
  });
}
