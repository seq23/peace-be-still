-- A new install's first chat on the private route (her ruling 21 Nov 2026): one row per install,
-- decided once by the Worker (firstprivate.ts), never by the app. granted 1 = this install had (or is having)
-- its first chat private; 0 = the normal free lane, with the reason (no_devicecheck, device_used, ip_cap,
-- global_cap, cap, devicecheck_error, not_new). The row is the install's cohort for the paid-conversion comparison.
-- ip_hash (the daily salted hash) is cleared after the day (cleanup.ts); the row (install id, the random
-- conversation id, day, granted, reason) is deleted after FIRST_PRIVATE_KEEP_DAYS.
CREATE TABLE IF NOT EXISTS chat_first_private (
  install_id TEXT PRIMARY KEY,
  conversation TEXT,
  granted INTEGER NOT NULL,
  reason TEXT NOT NULL,
  ip_hash TEXT,
  day TEXT NOT NULL,
  decided_at INTEGER NOT NULL,
  messages INTEGER NOT NULL DEFAULT 0,
  ended_at INTEGER,
  ended_reason TEXT,
  paid_at INTEGER -- the first time this install chatted with a paid plan: the conversion the cohort compares
);
CREATE INDEX IF NOT EXISTS chat_first_private_day ON chat_first_private (day, granted, ip_hash);

INSERT OR IGNORE INTO schema_version (migration) VALUES ('0009_first_private');
