// Paid status is verified on the server with RevenueCat, never taken from the app. The app's
// RevenueCat app user id is the install id inside the signed token (phase 5 logs in with it).
// Cached in D1 for an hour. No key or RevenueCat down = free (fail closed), counted and logged.
import { logCode } from './counts';

export type Paid = { paid: boolean; paidUntil: number | null };
const HOUR = 3600_000;
const DAY = 24 * HOUR;

export async function paidStatus(env: Env, installId: string, now: number, fetcher: typeof fetch = fetch): Promise<Paid & { source: 'cache' | 'revenuecat' | 'stop' }> {
  const cached = await env.DB.prepare('SELECT paid, paid_until, checked_at FROM chat_entitlement WHERE install_id = ?').bind(installId).first<{ paid: number; paid_until: number | null; checked_at: number }>();
  if (cached && now - cached.checked_at < HOUR) return { paid: cached.paid === 1 && (cached.paid_until === null || cached.paid_until > now), paidUntil: cached.paid_until, source: 'cache' };
  if (!env.REVENUECAT_SECRET_KEY) {
    logCode('REVENUECAT_SECRET_KEY_MISSING');
    return { paid: false, paidUntil: null, source: 'stop' };
  }
  let paid = false; let paidUntil: number | null = null;
  try {
    const res = await fetcher(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(installId)}`, {
      headers: { authorization: `Bearer ${env.REVENUECAT_SECRET_KEY}`, accept: 'application/json' }, signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP_${res.status}`);
    const body = (await res.json()) as { subscriber?: { entitlements?: Record<string, { expires_date?: string | null; grace_period_expires_date?: string | null }> } };
    const ent = body.subscriber?.entitlements?.[env.REVENUECAT_ENTITLEMENT];
    if (ent) {
      const ends = [ent.expires_date, ent.grace_period_expires_date].filter((d): d is string => !!d).map(d => Date.parse(d)).filter(Number.isFinite);
      paidUntil = ent.expires_date === null ? null : ends.length ? Math.max(...ends) : null;
      paid = ent.expires_date === null || (paidUntil !== null && paidUntil > now);
    }
  } catch {
    logCode('REVENUECAT_UNAVAILABLE');
    if (cached) return { paid: cached.paid === 1 && (cached.paid_until === null || cached.paid_until > now), paidUntil: cached.paid_until, source: 'cache' };
    return { paid: false, paidUntil: null, source: 'stop' };
  }
  await env.DB.batch([
    env.DB.prepare('INSERT INTO chat_entitlement (install_id, paid, paid_until, checked_at) VALUES (?, ?, ?, ?) ON CONFLICT(install_id) DO UPDATE SET paid = excluded.paid, paid_until = excluded.paid_until, checked_at = excluded.checked_at')
      .bind(installId, paid ? 1 : 0, paidUntil, now),
    // Memory lives until 30 days after the paid plan ends; keep its clock current. Paid: the plan's
    // end (a lifetime plan: a year out, renewed by every check). Not paid (lapsed, refunded,
    // revoked): the plan ended at its expiry, or now if RevenueCat no longer names one.
    paid
      ? env.DB.prepare('UPDATE chat_memory SET paid_until = ? WHERE install_id = ?').bind(paidUntil ?? now + 365 * DAY, installId)
      : env.DB.prepare('UPDATE chat_memory SET paid_until = min(paid_until, ?) WHERE install_id = ?').bind(paidUntil ?? now, installId),
  ]);
  return { paid, paidUntil, source: 'revenuecat' };
}

/** Hourly: re-asks RevenueCat about memory rows not checked in the last day, so memory goes 30 days
 *  after the plan ends even when she never opens chat again (a refund, a lapsed or revoked plan). */
export async function recheckMemory(env: Env, now: number, fetcher: typeof fetch = fetch, batch = 25): Promise<number> {
  const due = (await env.DB.prepare('SELECT m.install_id AS id FROM chat_memory m LEFT JOIN chat_entitlement e ON e.install_id = m.install_id WHERE e.install_id IS NULL OR e.checked_at < ? ORDER BY m.updated_at LIMIT ?')
    .bind(now - DAY, batch).all<{ id: string }>()).results;
  let checked = 0;
  for (const { id } of due) {
    if ((await paidStatus(env, id, now, fetcher)).source === 'stop') break;
    checked++;
  }
  return checked;
}
