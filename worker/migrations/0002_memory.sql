-- Paid chat memory: a short summary (at most 1,000 characters) under the anonymous install id.
-- Deleted from Settings (DELETE /api/memory) or by the cron 30 days after paid_until.
CREATE TABLE IF NOT EXISTS chat_memory (
  install_id TEXT PRIMARY KEY, summary TEXT NOT NULL CHECK (length(summary) <= 1000),
  updated_at INTEGER NOT NULL, paid_until INTEGER NOT NULL);
-- RevenueCat answer cached for an hour; rows go with the counters (cron, 48 hours).
CREATE TABLE IF NOT EXISTS chat_entitlement (install_id TEXT PRIMARY KEY, paid INTEGER NOT NULL, paid_until INTEGER, checked_at INTEGER NOT NULL);

INSERT OR IGNORE INTO schema_version (migration) VALUES ('0002_memory');
