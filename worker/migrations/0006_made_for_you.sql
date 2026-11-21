-- Made for you (phase 4M; follows phase 3's 0001-0005). One row per request, its life in `state`
-- (worker/src/madeForYou.ts). Her note is kept only until a script passes the content check, and
-- never past 7 days; the script only until the audio is published. Nothing here is logged.
CREATE TABLE IF NOT EXISTS made_for_you (
  id TEXT PRIMARY KEY,
  install_id TEXT NOT NULL,
  day TEXT NOT NULL,                 -- Central day of the request: one a day (made_for_you_one_a_day)
  kind TEXT NOT NULL CHECK (kind IN ('psalm', 'imagination')),
  lang TEXT NOT NULL CHECK (lang IN ('en', 'es')),
  teen INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  due_at INTEGER NOT NULL,           -- the time she was promised: 08:00 Central of the night's end
  state TEXT NOT NULL CHECK (state IN ('queued', 'scripted', 'ready', 'stopped', 'expired', 'deleted')),
  note TEXT CHECK (note IS NULL OR state = 'queued'),
  script TEXT CHECK (script IS NULL OR state = 'scripted'),
  attempts INTEGER NOT NULL DEFAULT 0,
  retry_code TEXT,
  lease TEXT,
  lease_until INTEGER,
  audio_path TEXT,
  seconds REAL,
  sha256 TEXT,
  published_at INTEGER,
  paid_until INTEGER
);
-- One a day, but a request WE failed (stopped) does not use up her day.
CREATE UNIQUE INDEX IF NOT EXISTS made_for_you_one_a_day ON made_for_you (install_id, day) WHERE state <> 'stopped';
CREATE INDEX IF NOT EXISTS made_for_you_queue ON made_for_you (due_at, created_at) WHERE state IN ('queued', 'scripted');
CREATE INDEX IF NOT EXISTS made_for_you_shelf ON made_for_you (install_id, kind, lang, created_at);

-- "Report this session": the time, the reason (the chat's four), the kind, the language and a copy of
-- the audio under reports/ with no install id. Deleted with its audio after 90 days.
CREATE TABLE IF NOT EXISTS made_for_you_report (
  at INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('hurtful', 'wrong', 'unsafe', 'other')),
  kind TEXT NOT NULL,
  lang TEXT NOT NULL,
  audio_key TEXT NOT NULL CHECK (audio_key LIKE 'reports/%')
);
CREATE INDEX IF NOT EXISTS made_for_you_report_at ON made_for_you_report (at);

INSERT OR IGNORE INTO schema_version (migration) VALUES ('0006_made_for_you');
