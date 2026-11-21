// Chat controls for the two lanes (owner's design, 21 Nov 2026): a pause on one install (the
// operator's kill switch, or the abuse throttle's 24 hours), the abuse throttle itself, and the
// paid lane's cost meters (per install per month, and the whole app per day). Code reads only
// structure here: counts, keyed hashes and money, never what she wrote.
import { fold } from './shared';
import { logCode } from './counts';
import { centralDay } from './day';

const HOUR = 3600_000;
export const PAUSE_HOURS = 24;
/** Strikes in a day before the throttle slows her down, then pauses chat for 24 hours. */
export const SLOW_AT = 3;
export const PAUSE_AT = 6;

export type Block = { reason: string; until: number | null };
export async function blockFor(db: D1Database, installId: string, now: number): Promise<Block | null> {
  return db.prepare('SELECT reason, until FROM chat_block WHERE install_id = ? AND (until IS NULL OR until > ?)').bind(installId, now).first<Block>();
}
export async function setBlock(db: D1Database, installId: string, reason: string, until: number | null, now: number): Promise<void> {
  await db.prepare('INSERT INTO chat_block VALUES (?, ?, ?, ?) ON CONFLICT(install_id) DO UPDATE SET reason = excluded.reason, until = excluded.until, at = excluded.at')
    .bind(installId, reason.slice(0, 60), until, now).run();
}
export async function liftBlock(db: D1Database, installId: string): Promise<void> {
  await db.prepare('DELETE FROM chat_block WHERE install_id = ?').bind(installId).run();
}

// Jailbreak or prompt-injection spam: the shapes, not the meaning (a single one is answered kindly).
const INJECTION = / (?:ignore (?:all|your|the|previous|prior|these)|system prompt|you are now|you are dan|new rules|new instructions?|developer mode|jailbreak|olvida (?:tus|las) reglas|ahora eres|nuevas reglas) /;
async function keyed(secret: string, text: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(`abuse|${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text))).slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export type Throttle = { verdict: 'ok' | 'slow' | 'paused'; reason?: string };
/**
 * One strike for each sign of abuse in this message: the same words as her last message, an
 * injection or jailbreak shape, or the burst limiter tripped. At SLOW_AT strikes in a day she is
 * slowed (each further message refused for now); at PAUSE_AT chat pauses for 24 hours.
 */
export async function throttle(db: D1Database, secret: string, day: string, installId: string, text: string | null, burst: boolean, now: number): Promise<Throttle> {
  // text is null for a flood strike (the burst limiter refused the request before it was read).
  const folded = text === null ? '' : ` ${fold(text)} `;
  const hash = text === null ? null : await keyed(secret, folded.trim());
  const row = await db.prepare('SELECT strikes, last_hash FROM chat_abuse WHERE day = ? AND install_id = ?').bind(day, installId).first<{ strikes: number; last_hash: string | null }>();
  const reasons = [hash && row?.last_hash === hash ? 'repeat' : '', INJECTION.test(folded) ? 'injection' : '', burst ? 'flood' : ''].filter(Boolean);
  const strikes = (row?.strikes ?? 0) + reasons.length;
  await db.prepare('INSERT INTO chat_abuse VALUES (?, ?, ?, ?) ON CONFLICT(day, install_id) DO UPDATE SET strikes = excluded.strikes, last_hash = COALESCE(excluded.last_hash, last_hash)')
    .bind(day, installId, strikes, hash).run();
  if (strikes >= PAUSE_AT) {
    const reason = `abuse:${reasons[0] ?? 'repeat'}`;
    await setBlock(db, installId, reason, now + PAUSE_HOURS * HOUR, now);
    logCode('CHAT_ABUSE_PAUSE', { reason, strikes });
    return { verdict: 'paused', reason };
  }
  if (strikes >= SLOW_AT && reasons.length) { logCode('CHAT_ABUSE_SLOW', { reason: reasons[0], strikes }); return { verdict: 'slow', reason: reasons[0] }; }
  return { verdict: 'ok' };
}

/** Millionths of a dollar for one call at per-million-token prices (thinking is billed as output). */
/** Cost in millionths of a dollar. Cached input (a repeated prompt prefix the route caches) is billed at priceCached. */
export function microCost(tokens: { in: number; out: number; think: number; cached?: number }, priceIn: number, priceOut: number, priceCached = priceIn): number {
  const cached = Math.min(tokens.cached ?? 0, tokens.in);
  return Math.ceil((tokens.in - cached) * priceIn + cached * priceCached + (tokens.out + tokens.think) * priceOut);
}
/** The month in Central time (YYYY-MM): both meters run on calendar months, CT. */
export const monthOf = (now: number) => centralDay(now).slice(0, 7);
/** The first day of next month (CT), when a month's meters reset. */
export function resetsOn(now: number): string {
  const [y, m] = monthOf(now).split('-').map(Number);
  return m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
}
export async function userSpend(db: D1Database, installId: string, now: number): Promise<number> {
  return (await db.prepare('SELECT micro FROM chat_paid_spend WHERE install_id = ? AND month = ?').bind(installId, monthOf(now)).first<{ micro: number }>())?.micro ?? 0;
}
export async function addUserSpend(db: D1Database, installId: string, micro: number, paidUntil: number | null, now: number): Promise<void> {
  if (micro <= 0) return;
  await db.prepare('INSERT INTO chat_paid_spend VALUES (?, ?, ?, ?) ON CONFLICT(install_id, month) DO UPDATE SET micro = micro + excluded.micro, paid_until = excluded.paid_until')
    .bind(installId, monthOf(now), micro, paidUntil ?? now + 365 * 24 * HOUR).run();
}
/** The app's paid-route spend this month (CT), from the day counters (metric paid_spend_micro), crisis follow-ups included. */
export async function appSpendMonth(db: D1Database, now: number): Promise<number> {
  return (await db.prepare("SELECT COALESCE(SUM(n), 0) AS n FROM chat_counts WHERE metric = 'paid_spend_micro' AND day LIKE ?").bind(`${monthOf(now)}-%`).first<{ n: number }>())?.n ?? 0;
}
/**
 * The owner's alerts on the monthly cap, each once a month: at 80% (CHAT_PAID_CAP_80) and at the cap
 * (the named stop CHAT_PAID_MONTHLY_CAP). Recorded in chat_counts under the month (day = YYYY-MM) and
 * shown by GET /api/admin/spend, so a reader of either sees it.
 */
export async function capAlert(db: D1Database, now: number, level: 80 | 100, micro: number, capUsd: number): Promise<boolean> {
  const metric = `paid_cap_alert:${level}`;
  const fresh = (await db.prepare('INSERT INTO chat_counts (day, metric, n) VALUES (?, ?, 1) ON CONFLICT(day, metric) DO NOTHING').bind(monthOf(now), metric).run()).meta.changes === 1;
  if (fresh) logCode(level === 100 ? 'NAMED STOP CHAT_PAID_MONTHLY_CAP' : 'CHAT_PAID_CAP_80', { spentUsd: Math.round(micro / 1e4) / 100, capUsd, month: monthOf(now) });
  return fresh;
}
/** The safety model's monthly spend (counted as billed, though the daily free neurons cover most):
 *  neurons x $0.011 per 1,000. Alerts at 80% (CHAT_SAFETY_CAP_80) and at the cap (NAMED STOP CHAT_SAFETY_MONTHLY_CAP). */
export function safetyMicro(model: string): number {
  const neurons = /70b/i.test(model) ? 20 : /guard|8b|3b|1b/i.test(model) ? 3 : 10;
  return neurons * 11;
}
export async function safetyBudgetLeft(db: D1Database, now: number, capUsd: number): Promise<boolean> {
  const micro = (await db.prepare("SELECT COALESCE(SUM(n), 0) AS n FROM chat_counts WHERE metric = 'safety_micro' AND day LIKE ?").bind(`${monthOf(now)}-%`).first<{ n: number }>())?.n ?? 0;
  const alert = async (level: 80 | 100, code: string) => {
    const fresh = (await db.prepare('INSERT INTO chat_counts (day, metric, n) VALUES (?, ?, 1) ON CONFLICT(day, metric) DO NOTHING').bind(monthOf(now), `safety_cap_alert:${level}`).run()).meta.changes === 1;
    if (fresh) logCode(code, { spentUsd: Math.round(micro / 1e4) / 100, capUsd, month: monthOf(now) });
  };
  if (micro >= capUsd * 1e6) { await alert(100, 'NAMED STOP CHAT_SAFETY_MONTHLY_CAP'); return false; }
  if (micro >= 0.8 * capUsd * 1e6) await alert(80, 'CHAT_SAFETY_CAP_80');
  return true;
}
export async function spendStatus(db: D1Database, now: number, capUsd: number) {
  const micro = await appSpendMonth(db, now);
  const alerts = (await db.prepare("SELECT metric FROM chat_counts WHERE day = ? AND metric LIKE 'paid_cap_alert:%'").bind(monthOf(now)).all<{ metric: string }>()).results.map(r => r.metric.split(':')[1]);
  return { month: monthOf(now), spentUsd: micro / 1e6, capUsd, resetsOn: resetsOn(now), alerts };
}
/** A yearly (or lifetime) plan nets less per month than a monthly one, so its ceiling is lower. */
export function userCeilingUsd(env: { CHAT_USER_MONTHLY_USD_YEARLY?: string; CHAT_USER_MONTHLY_USD_MONTHLY?: string }, paidUntil: number | null, now: number): number {
  const yearly = paidUntil === null || paidUntil - now > 45 * 24 * HOUR;
  // The amounts live only in wrangler.jsonc (owner's ruling 21 Nov 2026: yearly $1, monthly $5).
  // A missing or broken value pauses at $0, toward the cap, never unmetered.
  const usd = Number(yearly ? env.CHAT_USER_MONTHLY_USD_YEARLY : env.CHAT_USER_MONTHLY_USD_MONTHLY);
  return Number.isFinite(usd) && usd >= 0 ? usd : 0;
}
