-- Store-page visits for the Boss OS scorecard row pbs-social (social_store_visits_28d): a tap on a store
-- badge goes through /go/app-store or /go/google-play, which adds 1 here and redirects to the listing.
-- One row per UTC day, source and store. Counts only: no cookie, IP or user agent. Additive only.
-- schema_version 3's applied_at is the day counting started (GET /api/social-visits store.counting_since).
CREATE TABLE IF NOT EXISTS store_taps (
  day TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('threads', 'instagram', 'facebook', 'direct')),
  store TEXT NOT NULL CHECK (store IN ('ios', 'play')),
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, source, store)
);
INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (3, strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));
