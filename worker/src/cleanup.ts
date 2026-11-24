// The hourly cron keeps the privacy policy's promises (test/privacy-promises.test.ts):
// - counters (device, IP hash, token issue, store review tries): deleted the first run after their Central day ends,
//   with an hour's grace for a reply still in flight, so at most ~26 hours old (policy: within 48);
// - the entitlement cache and her install's answer shapes (keyed hashes, quality/variety.ts) carry
//   the install id, so they go with the counters: within 48 hours;
// - everyone's answer shapes (scope 'all', no identifier): deleted after 14 days;
// - reported answers (the answer text and a reason, no identifier, src/report.ts): after 90 days;
// - paid chat memory: deleted 30 days after the paid plan ends (paid_until, kept current by
//   recheckMemory and every paid check in entitlement.ts).
import { SHAPE_DAYS } from './quality/variety';
import { centralDay } from './day';
import { REPORT_DAYS } from './report';
import { FIRST_PRIVATE_KEEP_DAYS } from './firstprivate';
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
    db.prepare('DELETE FROM answer_report WHERE at < ?').bind(now - REPORT_DAYS * DAY),
    db.prepare('DELETE FROM chat_abuse WHERE day < ?').bind(ended),
    db.prepare('DELETE FROM chat_block WHERE until IS NOT NULL AND until < ?').bind(now),
    db.prepare('DELETE FROM chat_crisis WHERE flagged_at < ?').bind(now - 2 * 86_400_000),
    db.prepare('DELETE FROM chat_paid_spend WHERE paid_until < ? OR month < ?').bind(now - 30 * DAY, new Date(now - 40 * DAY).toISOString().slice(0, 7)),
    db.prepare('DELETE FROM chat_short_day WHERE day < ?').bind(ended),
    db.prepare('DELETE FROM review_try_day WHERE day < ?').bind(ended),
    db.prepare('DELETE FROM review_ip_day WHERE day < ?').bind(ended),
    // A store reviewer's grant row (a keyed hash of the install id): 7 days after the grant ends.
    db.prepare('DELETE FROM review_grant WHERE expires_at < ?').bind(now - 7 * DAY),
    // The first private chat: the IP hash goes after the day. The conversation id (random) stays for the row's life,
    // so that conversation never carries its private turns to free chat on a later day (review 21 Nov 2026).
    db.prepare('UPDATE chat_first_private SET ip_hash = NULL WHERE day < ? AND ip_hash IS NOT NULL').bind(ended),
    db.prepare('DELETE FROM chat_first_private WHERE decided_at < ?').bind(now - FIRST_PRIVATE_KEEP_DAYS * DAY),
  ]);
  const [device, ip, token, entitlement, memory, installShapes, shapes, reports, abuse, blocks, crisis, spend, short, reviewTries, reviewIp, reviewGrants, firstCleared, firstDeleted] = results.map(r => r.meta.changes ?? 0);
  return { device, ip, token, entitlement, memory, shapes: installShapes + shapes, reports, abuse, blocks, crisis, spend, short, reviewTries: reviewTries + reviewIp, reviewGrants, firstCleared, firstDeleted };
}
