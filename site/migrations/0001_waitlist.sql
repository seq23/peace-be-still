-- Launch waitlist: one email per person, used once to say the app is live, then deleted.
-- Boss OS counts sign-ups from this table by created_at (ISO 8601 text). Additive only.
CREATE TABLE IF NOT EXISTS waitlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  language TEXT NOT NULL CHECK (language IN ('en', 'es')),
  door TEXT CHECK (door IS NULL OR door IN ('gods-word', 'mindset')),
  consent INTEGER NOT NULL CHECK (consent = 1),
  consent_text TEXT NOT NULL,
  source_path TEXT,
  remove_token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist (created_at);

CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
INSERT OR IGNORE INTO schema_version (version, applied_at) VALUES (1, '2026-11-18T00:00:00Z');
