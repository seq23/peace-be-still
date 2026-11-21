-- Chat controls (two lanes, 21 Nov 2026). Additive only.
-- A pause on one install: set by the operator (POST /api/admin/chat-block, until NULL = until lifted)
-- or by the abuse throttle (24 hours). The reason is a short code, never her words.
CREATE TABLE IF NOT EXISTS chat_block (
  install_id TEXT PRIMARY KEY, reason TEXT NOT NULL CHECK (length(reason) <= 60), until INTEGER, at INTEGER NOT NULL);
-- The abuse throttle's count for today: strikes and a keyed hash of her last message (never the text).
-- Deleted with the other day counters (cron, 48 hours).
CREATE TABLE IF NOT EXISTS chat_abuse (
  day TEXT NOT NULL, install_id TEXT NOT NULL, strikes INTEGER NOT NULL DEFAULT 0, last_hash TEXT, PRIMARY KEY (day, install_id));
-- A paid install's AI cost this month, in millionths of a dollar, kept with the memory clock
-- (deleted 30 days after the plan ends, and every month older than last month).
CREATE TABLE IF NOT EXISTS chat_paid_spend (
  install_id TEXT NOT NULL, month TEXT NOT NULL, micro INTEGER NOT NULL DEFAULT 0, paid_until INTEGER NOT NULL, PRIMARY KEY (install_id, month));

INSERT OR IGNORE INTO schema_version (migration) VALUES ('0006_chat_controls');
