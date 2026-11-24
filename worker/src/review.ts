// Store review access. Peace Be Still has no accounts, so Google Play's reviewer reaches the paid lane with ONE
// 10-digit code, never a free switch in the app. One contract with KeepMyProof, ApprovalPrep and Dream Wedding
// (~/Work/google-play-2026-11-21/REVIEW-UNLOCK-DESIGN.md section 3; this was its reference and now has its device cap).
// - Off unless every value is set: the Worker secrets REVIEW_CODE (exactly 10 digits, from the vault's
//   PBS_PLAY_REVIEW_CODE) and REVIEW_UNTIL (the date the window closes, e.g. "2026-12-05"), the var
//   REVIEW_CODE_VERSION (the window id), IP_HASH_SECRET and REVENUECAT_SECRET_KEY. Otherwise every review route
//   answers 404 and makes no network call.
// - On: the app asks GET /api/review (200 means "show the review link"), then POST /api/review/unlock { code } with
//   its install token. The right code asks RevenueCat to grant this install the paid entitlement until
//   min(7 days, REVIEW_UNTIL); from then on RevenueCat answers "paid" to the app and to this Worker like any
//   subscriber. Nothing in the app or here decides paid on its own.
// - Order: body (JSON, at most 1 KB) -> try limits, all taken atomically BEFORE the compare (5 a minute per install,
//   REVIEW_LIMITS.perInstallDaily per install, perIpDaily per IP, globalDaily for everyone) -> constant-time compare
//   -> device slot (a new install takes one of REVIEW_MAX_DEVICES per code version, at most newSlotsPerIpDaily new
//   ones per IP a day; the same install again takes none and gets a fresh grant) -> RevenueCat grant.
// - A leaked code is worth at most REVIEW_MAX_DEVICES installs x 7 days; the cap files an Open Loops row (rotate it).
// - RevenueCat down, refusing or slow: what this call may have granted is revoked (promotional grants only, never a
//   purchase), its slot is given back, and the answer is 503 "try again", never unlocked. D1 down: 503.
import { logCode, reserve } from './counts';
import { centralDay } from './day';
import { ipHash, keyedHash } from './iphash';

export const REVIEW_LIMITS = { perInstallDaily: 10, perIpDaily: 20, globalDaily: 1000, newSlotsPerIpDaily: 2, maxDevices: 10 };
const CODE = /^\d{10}$/;
const VERSION = /^[A-Za-z0-9._-]{1,32}$/;
const DAY = 86400_000;
const WEEK = 7 * DAY;
export const REVIEW_MAX_BODY = 1024;
const RC = 'https://api.revenuecat.com/v1/subscribers';
const OPEN_LOOPS_INTAKE = 'https://boss.sequoiataylor.com/api/boss/open-loops/intake';

type ReviewEnv = Pick<Env, 'REVIEW_CODE' | 'REVIEW_UNTIL' | 'REVIEW_CODE_VERSION' | 'IP_HASH_SECRET' | 'REVENUECAT_SECRET_KEY'>;
/** The window is open only with a 10-digit code, a future end date, a code version and both keys it needs. */
export function reviewOpen(env: ReviewEnv, now: number): boolean {
  const until = Date.parse(env.REVIEW_UNTIL ?? '');
  return CODE.test(env.REVIEW_CODE ?? '') && Number.isFinite(until) && until > now && VERSION.test(env.REVIEW_CODE_VERSION ?? '') &&
    (env.IP_HASH_SECRET ?? '').length >= 32 && !!env.REVENUECAT_SECRET_KEY;
}

const maxDevices = (env: Env) => { const n = Number(env.REVIEW_MAX_DEVICES ?? REVIEW_LIMITS.maxDevices); return Number.isInteger(n) && n > 0 && n <= 50 ? n : REVIEW_LIMITS.maxDevices; };

async function same(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [x, y] = [enc.encode(a), enc.encode(b)];
  return x.byteLength === y.byteLength && crypto.subtle.timingSafeEqual(x, y);
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
const closed = () => json({ error: 'NOT_FOUND' }, 404);
const tryAgain = () => json({ error: 'TRY_AGAIN' }, 503);
const slow = () => json({ error: 'SLOW_DOWN' }, 429);

export async function reviewStatus(env: Env, now: number): Promise<Response> {
  return reviewOpen(env, now) ? json({ open: true }) : closed();
}

/** One atomic count against a cap in review_ip_day: true when taken, false when full. */
async function takeIp(db: D1Database, day: string, ip: string, kind: 'try' | 'slot', cap: number): Promise<boolean> {
  return !!(await db.prepare('INSERT INTO review_ip_day (day, ip_hash, kind, n) VALUES (?, ?, ?, 1) ON CONFLICT(day, ip_hash, kind) DO UPDATE SET n = n + 1 WHERE n < ? RETURNING n')
    .bind(day, ip, kind, cap).first());
}
const giveBackSlot = (db: D1Database, day: string, ip: string) =>
  db.prepare("UPDATE review_ip_day SET n = n - 1 WHERE day = ? AND ip_hash = ? AND kind = 'slot' AND n > 0").bind(day, ip).run();

export type ReviewDeps = { now: number; ip: string; fetcher?: typeof fetch; waitUntil?: (p: Promise<unknown>) => void };

export async function reviewUnlock(env: Env, installId: string, raw: string, { now, ip, fetcher = fetch, waitUntil = () => {} }: ReviewDeps): Promise<Response> {
  if (!reviewOpen(env, now)) return closed();
  // Body: at most 1 KB of JSON holding the code. Anything else is refused before any count or call.
  if (raw.length > REVIEW_MAX_BODY) return json({ error: 'BAD_REQUEST' }, 400);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json({ error: 'BAD_REQUEST' }, 400); }
  const code = (body as { code?: unknown } | null)?.code;

  const db = env.DB, day = centralDay(now), version = env.REVIEW_CODE_VERSION!;
  let ipKey: string, idKey: string;
  try {
    [ipKey, idKey] = await Promise.all([ipHash(env.IP_HASH_SECRET, day, ip), keyedHash(env.IP_HASH_SECRET, `review|${installId}`)]);
  } catch { logCode('IP_HASH_SECRET_MISSING'); return closed(); }
  // Limits, taken before the code is compared, so every guess costs a try whatever it is.
  try {
    if (!(await env.REVIEW_BURST.limit({ key: installId })).success) return slow();
    const mine = await db.prepare('INSERT INTO review_try_day (day, install_id, tries) VALUES (?, ?, 1) ON CONFLICT(day, install_id) DO UPDATE SET tries = tries + 1 WHERE tries < ? RETURNING tries')
      .bind(day, installId, REVIEW_LIMITS.perInstallDaily).first<{ tries: number }>();
    if (!mine) { logCode('REVIEW_INSTALL_DAILY_CAP'); return slow(); }
    if (!(await takeIp(db, day, ipKey, 'try', REVIEW_LIMITS.perIpDaily))) { logCode('REVIEW_IP_DAILY_CAP'); return slow(); }
    if (!(await reserve(db, day, 'review_tries', REVIEW_LIMITS.globalDaily))) { logCode('REVIEW_DAILY_CAP'); return slow(); }
  } catch { logCode('REVIEW_DB_UNAVAILABLE'); return tryAgain(); }

  if (typeof code !== 'string' || !CODE.test(code) || !(await same(code, env.REVIEW_CODE!))) {
    logCode('REVIEW_CODE_WRONG');
    return json({ error: 'WRONG_CODE' }, 403);
  }

  // Device slot: the same install again takes no new slot; a new one takes one of maxDevices for this code version,
  // and one IP may open at most newSlotsPerIpDaily a day, so a leaked code cannot burn every slot at once.
  const expires = Math.min(now + WEEK, Date.parse(env.REVIEW_UNTIL!));
  let newSlot = false, ipSlot = false;
  try {
    const had = await db.prepare('SELECT 1 AS x FROM review_grant WHERE window_id = ? AND id_hash = ?').bind(version, idKey).first();
    if (!had) {
      if (!(await takeIp(db, day, ipKey, 'slot', REVIEW_LIMITS.newSlotsPerIpDaily))) { logCode('REVIEW_IP_SLOT_CAP'); return json({ error: 'USED_UP' }, 403); }
      ipSlot = true;
      const row = await db.prepare('INSERT INTO review_grant (window_id, id_hash, granted_at, expires_at) SELECT ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM review_grant WHERE window_id = ?) < ? ON CONFLICT(window_id, id_hash) DO NOTHING RETURNING id_hash')
        .bind(version, idKey, now, expires, version, maxDevices(env)).first();
      if (!row) {
        await giveBackSlot(db, day, ipKey);
        logCode('REVIEW_DEVICE_CAP');
        waitUntil(fileCapLoop(env, fetcher));
        return json({ error: 'USED_UP' }, 403);
      }
      newSlot = true;
    }
  } catch {
    if (ipSlot) await giveBackSlot(db, day, ipKey).catch(() => {});
    logCode('REVIEW_DB_UNAVAILABLE');
    return tryAgain();
  }

  const rc = (path: string, payload: unknown) => fetcher(`${RC}/${encodeURIComponent(installId)}/entitlements/${encodeURIComponent(env.REVENUECAT_ENTITLEMENT)}/${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.REVENUECAT_SECRET_KEY}`, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
  });
  try {
    const res = await rc('promotional', { end_time_ms: expires });
    if (res.status === 403) logCode('REVIEW_RC_KEY_READONLY');
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
  } catch {
    // A timeout may still have granted: revoke this install's promotional grants (never a purchase), give the slot
    // back, answer "try again". Nothing is ever half-granted.
    await rc('revoke_promotionals', {}).catch(() => {});
    if (newSlot) await db.prepare('DELETE FROM review_grant WHERE window_id = ? AND id_hash = ?').bind(version, idKey).run().catch(() => {});
    if (ipSlot) await giveBackSlot(db, day, ipKey).catch(() => {});
    logCode('REVIEW_RC_UNAVAILABLE');
    return tryAgain();
  }
  if (!newSlot) await db.prepare('UPDATE review_grant SET granted_at = ?, expires_at = ? WHERE window_id = ? AND id_hash = ?').bind(now, expires, version, idKey).run().catch(() => {});
  // The next paid check asks RevenueCat again instead of an hour-old "free" answer.
  await db.prepare('DELETE FROM chat_entitlement WHERE install_id = ?').bind(installId).run().catch(() => {});
  logCode('REVIEW_UNLOCKED');
  return json({ unlocked: true });
}

/** The cap was hit: a row on Boss OS's Open Loops list, so it is seen and the code rotated, not only logged. */
async function fileCapLoop(env: Env, fetcher: typeof fetch): Promise<void> {
  if (!env.BOSS_OPEN_LOOPS_TOKEN) { logCode('OPEN_LOOPS_TOKEN_MISSING'); return; }
  try {
    const r = await fetcher(OPEN_LOOPS_INTAKE, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${env.BOSS_OPEN_LOOPS_TOKEN}` },
      body: JSON.stringify({ repo: 'seq23/peace-be-still', stop: 'REVIEW_DEVICE_CAP', business: 'spry', owner: 'claude',
        finish_line: 'Peace Be Still: live in both stores, selling',
        title: 'Peace Be Still: the Play review code is used up',
        next_step: `All ${maxDevices(env)} review slots for code version ${env.REVIEW_CODE_VERSION} are taken. Rotate: new PBS_PLAY_REVIEW_CODE in the vault, new REVIEW_CODE secret and REVIEW_CODE_VERSION var on the Worker, then the new code goes in Play Console > App access.` }),
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) logCode('OPEN_LOOPS_REFUSED');
  } catch { logCode('OPEN_LOOPS_UNREACHABLE'); }
}
