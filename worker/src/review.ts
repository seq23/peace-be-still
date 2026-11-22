// Store review access. Peace Be Still has no accounts, so a store reviewer (Google Play, App Review) reaches the
// paid lane with ONE 6-digit code, the same shape as A Player Mode's review sign-in (docs/33-BILLING-PHASE-D.md
// there), never a free switch in the app.
// - Off unless BOTH are set: REVIEW_CODE (secret, exactly 6 digits) and REVIEW_UNTIL (var, the date the review
//   window closes, e.g. "2026-12-05"). Unset, malformed or past: every review route answers 404 and makes no
//   network call. Unset both after approval and the path is gone.
// - On: the app asks GET /api/review (200 means "show the code box"), then POST /api/review/unlock { code } with
//   its install token. The right code asks RevenueCat to grant this install the paid entitlement for one week;
//   from then on RevenueCat answers "paid" to the app and to this Worker like any subscriber. Nothing in the app
//   or here decides paid on its own.
// - Guessing: the code is compared in constant time; 5 tries a minute per install (REVIEW_BURST) and at most
//   REVIEW_TRIES_DAILY tries a day for everyone together, taken atomically before the code is compared, after
//   which the route answers 429 until tomorrow (Central): at most 30 guesses a day out of a million codes.
// - RevenueCat down or refusing: 503 "try again", never unlocked.
import { logCode, reserve } from './counts';
import { centralDay } from './day';

export const REVIEW_TRIES_DAILY = 30;
const WEEK = 7 * 86400_000;

/** The window is open only with a 6-digit code and a future end date. */
export function reviewOpen(env: Pick<Env, 'REVIEW_CODE' | 'REVIEW_UNTIL'>, now: number): boolean {
  const until = Date.parse(env.REVIEW_UNTIL ?? '');
  return /^\d{6}$/.test(env.REVIEW_CODE ?? '') && Number.isFinite(until) && until > now;
}

async function same(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [x, y] = [enc.encode(a), enc.encode(b)];
  return x.byteLength === y.byteLength && crypto.subtle.timingSafeEqual(x, y);
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
const closed = () => json({ error: 'NOT_FOUND' }, 404);

export async function reviewStatus(env: Env, now: number): Promise<Response> {
  return reviewOpen(env, now) && env.REVENUECAT_SECRET_KEY ? json({ open: true }) : closed();
}

export async function reviewUnlock(env: Env, installId: string, body: unknown, now: number, fetcher: typeof fetch = fetch): Promise<Response> {
  if (!reviewOpen(env, now)) return closed();
  if (!env.REVENUECAT_SECRET_KEY) { logCode('REVIEW_REVENUECAT_KEY_MISSING'); return closed(); }
  if (!(await env.REVIEW_BURST.limit({ key: installId })).success) return json({ error: 'SLOW_DOWN' }, 429);
  if (!(await reserve(env.DB, centralDay(now), 'review_tries', REVIEW_TRIES_DAILY))) { logCode('REVIEW_DAILY_CAP'); return json({ error: 'SLOW_DOWN' }, 429); }
  const code = (body as { code?: unknown } | null)?.code;
  if (typeof code !== 'string' || !/^\d{6}$/.test(code) || !(await same(code, env.REVIEW_CODE!))) {
    logCode('REVIEW_CODE_WRONG');
    return json({ error: 'WRONG_CODE' }, 403);
  }
  try {
    const res = await fetcher(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(installId)}/entitlements/${encodeURIComponent(env.REVENUECAT_ENTITLEMENT)}/promotional`, {
      method: 'POST',
      headers: { authorization: `Bearer ${env.REVENUECAT_SECRET_KEY}`, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ end_time_ms: now + WEEK }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
  } catch {
    logCode('REVIEW_UNLOCK_REVENUECAT_UNAVAILABLE');
    return json({ error: 'TRY_AGAIN' }, 503);
  }
  // The next paid check asks RevenueCat again instead of an hour-old "free" answer.
  await env.DB.prepare('DELETE FROM chat_entitlement WHERE install_id = ?').bind(installId).run();
  logCode('REVIEW_UNLOCKED');
  return json({ unlocked: true });
}
