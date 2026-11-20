// The hourly cron keeps the privacy policy's promises:
// - counters (device, IP hash, token issue) and the entitlement cache: deleted within 48 hours;
// - paid chat memory: deleted 30 days after the paid plan ends;
// - answer shapes (keyed hashes only, quality/variety.ts): deleted after 14 days.
import { SHAPE_DAYS } from './quality/variety';
import { centralDayMinus } from './day';
const DAY = 86400_000;

export async function cleanup(db: D1Database, now: number): Promise<Record<string, number>> {
  const yesterday = centralDayMinus(now, 1);
  const results = await db.batch([
    db.prepare('DELETE FROM chat_device_day WHERE day < ?').bind(yesterday),
    db.prepare('DELETE FROM chat_ip_day WHERE day < ?').bind(yesterday),
    db.prepare('DELETE FROM token_ip_day WHERE day < ?').bind(yesterday),
    db.prepare('DELETE FROM chat_entitlement WHERE checked_at < ?').bind(now - 2 * DAY),
    db.prepare('DELETE FROM chat_memory WHERE paid_until < ?').bind(now - 30 * DAY),
    db.prepare('DELETE FROM answer_shape WHERE at < ?').bind(now - SHAPE_DAYS * DAY),
  ]);
  const [device, ip, token, entitlement, memory, shapes] = results.map(r => r.meta.changes ?? 0);
  return { device, ip, token, entitlement, memory, shapes };
}
