CREATE TABLE made_for_you (
  id TEXT PRIMARY KEY,
  install_id TEXT NOT NULL,
  day TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('psalm', 'imagination')),
  lang TEXT NOT NULL CHECK (lang IN ('en', 'es')),
  teen INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  text TEXT,
  lease TEXT,
  lease_until INTEGER,
  audio_path TEXT,
  seconds REAL,
  sha256 TEXT,
  UNIQUE (install_id, day)
);
CREATE INDEX made_for_you_pending ON made_for_you (created_at) WHERE text IS NOT NULL;
