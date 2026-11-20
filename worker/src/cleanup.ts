// The hourly cron keeps the privacy policy's promises (test/privacy-promises.test.ts):
// - counters (device, IP hash, token issue): deleted the first run after their Central day ends,
//   with an hour's grace for a reply still in flight, so at most ~26 hours old (policy: within 48);
// - the entitlement cache and her install's answer shapes (keyed hashes, quality/variety.ts) carry
//   the install id, so they go with the counters: within 48 hours;
// - everyone's answer shapes (scope 'all', no identifier): deleted after 14 days;
// - paid chat memory: deleted 30 days after the paid plan ends (paid_until, kept current by
//   recheckMemory and every paid check in entitlement.ts).
import { SHAPE_DAYS } from './quality/variety';
import { centralDay } from './day';
const HOUR = 3600_000;
const DAY = 24 * HOUR;

export async function cleanup(db: D1Database, now: number): Promise<Record<string, number>> {
  const ended = centralDay(now - HOUR); // rows of days before this one are over
  const results = await db.batch([
    db.prepare('DELETE FROM chat_device_day WHERE day < ?').bind(ended),
    db.prepare('DELETE FROM chat_ip_day WHERE day < ?').bind(ended),
    db.prepare('DELETE FROM token_ip_day WHERE day < ?').bind(ended),
    db.prepare('DELETE FROM chat_entitlement WHERE checked_at < ?').bind(now - DAY),
    db.prepare('DELETE FROM chat_memory WHERE paid_until < ?').bind(now - 30 * DAY),
    db.prepare("DELETE FROM answer_shape WHERE scope <> 'all' AND at < ?").bind(now - 47 * HOUR),
    db.prepare('DELETE FROM answer_shape WHERE at < ?').bind(now - SHAPE_DAYS * DAY),
  ]);
  const [device, ip, token, entitlement, memory, installShapes, shapes] = results.map(r => r.meta.changes ?? 0);
  return { device, ip, token, entitlement, memory, shapes: installShapes + shapes };
}
