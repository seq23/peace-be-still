// Paid chat memory: a short summary of what she is carrying, at most 1,000 characters, under
// the anonymous install id. Never saved on a day the crisis layer fired for this device, and
// never when the summary itself trips the crisis floor. Deleted from Settings or by the cron
// 30 days after paid_until (privacy policy, "Paid chat memory").
import { floor } from './crisis';

export const MEMORY_MAX = 1000;
const DAY = 86400_000;

export async function readMemory(db: D1Database, installId: string): Promise<string | null> {
  const row = await db.prepare('SELECT summary FROM chat_memory WHERE install_id = ?').bind(installId).first<{ summary: string }>();
  return row?.summary ?? null;
}

export async function saveMemory(db: D1Database, args: { installId: string; day: string; summary: string; paidUntil: number | null; now: number }): Promise<'saved' | 'crisis' | 'empty'> {
  const summary = args.summary.trim().slice(0, MEMORY_MAX);
  if (!summary) return 'empty';
  const f = floor([{ role: 'user', text: summary }]);
  if (f.sure || f.ambiguous) return 'crisis';
  const fired = await db.prepare('SELECT crisis FROM chat_device_day WHERE day = ? AND device = ?').bind(args.day, args.installId).first<{ crisis: number }>();
  if (fired?.crisis) return 'crisis';
  await db.prepare('INSERT INTO chat_memory (install_id, summary, updated_at, paid_until) VALUES (?, ?, ?, ?) ON CONFLICT(install_id) DO UPDATE SET summary = excluded.summary, updated_at = excluded.updated_at, paid_until = excluded.paid_until')
    .bind(args.installId, summary, args.now, args.paidUntil ?? args.now + 365 * DAY).run();
  return 'saved';
}

export async function deleteMemory(db: D1Database, installId: string): Promise<void> {
  await db.prepare('DELETE FROM chat_memory WHERE install_id = ?').bind(installId).run();
}

/** Mark today's row for this device: the crisis layer fired, so nothing is remembered today. */
export async function markCrisis(db: D1Database, day: string, installId: string, conversation: string, now: number): Promise<void> {
  await db.prepare('INSERT INTO chat_device_day (day, device, conversation, messages, first_msg_at, crisis) VALUES (?, ?, ?, 0, ?, 1) ON CONFLICT(day, device) DO UPDATE SET crisis = 1')
    .bind(day, installId, conversation, now).run();
}
