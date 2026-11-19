-- Social visit counts for the Boss OS scorecard row pbs-social: one row per UTC day and source
-- (threads, instagram, facebook), n = page views. Counts only: no cookie, IP or user agent. Additive only.
CREATE TABLE IF NOT EXISTS social_visits (
  day TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('threads', 'instagram', 'facebook')),
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, source)
);
INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (2, '2026-11-19T00:00:00Z');
