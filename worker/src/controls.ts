// Chat controls for the two lanes (owner's design, 21 Nov 2026): a pause on one install (the
// operator's kill switch, or the abuse throttle's 24 hours), the abuse throttle itself, and the
// paid lane's cost meters (per install per month, and the whole app per day). Code reads only
// structure here: counts, keyed hashes and money, never what she wrote.
import { fold } from './shared';
import { logCode } from './counts';

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
export function microCost(tokens: { in: number; out: number; think: number }, priceIn: number, priceOut: number): number {
  return Math.ceil(tokens.in * priceIn + (tokens.out + tokens.think) * priceOut);
}
export const monthOf = (now: number) => new Date(now).toISOString().slice(0, 7);
/** The first day of next month (UTC), when a month's meter resets. */
export function resetsOn(now: number): string {
  const d = new Date(now);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
}
export async function userSpend(db: D1Database, installId: string, now: number): Promise<number> {
  return (await db.prepare('SELECT micro FROM chat_paid_spend WHERE install_id = ? AND month = ?').bind(installId, monthOf(now)).first<{ micro: number }>())?.micro ?? 0;
}
export async function addUserSpend(db: D1Database, installId: string, micro: number, paidUntil: number | null, now: number): Promise<void> {
  if (micro <= 0) return;
  await db.prepare('INSERT INTO chat_paid_spend VALUES (?, ?, ?, ?) ON CONFLICT(install_id, month) DO UPDATE SET micro = micro + excluded.micro, paid_until = excluded.paid_until')
    .bind(installId, monthOf(now), micro, paidUntil ?? now + 365 * 24 * HOUR).run();
}
/** The app's paid spend today, from the day's counters (metric paid_spend_micro). */
export async function appSpendToday(db: D1Database, day: string): Promise<number> {
  return (await db.prepare("SELECT n FROM chat_counts WHERE day = ? AND metric = 'paid_spend_micro'").bind(day).first<{ n: number }>())?.n ?? 0;
}
/** A yearly (or lifetime) plan nets less per month than a monthly one, so its ceiling is lower. */
export function userCeilingUsd(env: { CHAT_USER_MONTHLY_USD_YEARLY?: string; CHAT_USER_MONTHLY_USD_MONTHLY?: string }, paidUntil: number | null, now: number): number {
  const yearly = paidUntil === null || paidUntil - now > 45 * 24 * HOUR;
  return Number((yearly ? env.CHAT_USER_MONTHLY_USD_YEARLY : env.CHAT_USER_MONTHLY_USD_MONTHLY) ?? (yearly ? 2 : 5));
}
