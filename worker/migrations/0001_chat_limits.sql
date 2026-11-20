-- Chat limits. Nothing here holds chat text. Counter rows carry an install id and a keyed
-- IP hash and are deleted within 48 hours by the hourly cron (privacy policy, "limits").
CREATE TABLE IF NOT EXISTS schema_version (migration TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')));

-- One row per device per Central day: today's conversation, messages, the SB 243 reminder
-- clock for teens, and whether the crisis layer fired (memory is never saved that day).
CREATE TABLE IF NOT EXISTS chat_device_day (
  day TEXT NOT NULL, device TEXT NOT NULL, conversation TEXT NOT NULL, messages INTEGER NOT NULL,
  first_msg_at INTEGER NOT NULL DEFAULT 0, last_reminder_at INTEGER, crisis INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, device));
CREATE TABLE IF NOT EXISTS chat_ip_day (day TEXT NOT NULL, ip_hash TEXT NOT NULL, messages INTEGER NOT NULL, PRIMARY KEY (day, ip_hash));
CREATE TABLE IF NOT EXISTS chat_global_day (day TEXT PRIMARY KEY, messages INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS token_ip_day (day TEXT NOT NULL, ip_hash TEXT NOT NULL, issued INTEGER NOT NULL, PRIMARY KEY (day, ip_hash));

-- One insert reserves the global, IP and device limits atomically (the trigger aborts with a code).
CREATE TABLE IF NOT EXISTS chat_admission (day TEXT NOT NULL, device TEXT NOT NULL, conversation TEXT NOT NULL, ip_hash TEXT NOT NULL,
  paid INTEGER NOT NULL, device_limit INTEGER NOT NULL, ip_limit INTEGER NOT NULL, global_limit INTEGER NOT NULL, now INTEGER NOT NULL);
CREATE TRIGGER IF NOT EXISTS chat_admission_reserve BEFORE INSERT ON chat_admission BEGIN
  SELECT CASE WHEN COALESCE((SELECT messages FROM chat_global_day WHERE day = NEW.day), 0) >= NEW.global_limit THEN RAISE(ABORT, 'CHAT_GLOBAL_LIMIT') END;
  SELECT CASE WHEN COALESCE((SELECT messages FROM chat_ip_day WHERE day = NEW.day AND ip_hash = NEW.ip_hash), 0) >= NEW.ip_limit THEN RAISE(ABORT, 'CHAT_IP_LIMIT') END;
  SELECT CASE WHEN COALESCE((SELECT messages FROM chat_device_day WHERE day = NEW.day AND device = NEW.device), 0) >= NEW.device_limit THEN RAISE(ABORT, 'CHAT_DEVICE_LIMIT') END;
  SELECT CASE WHEN NEW.paid = 0 AND EXISTS (SELECT 1 FROM chat_device_day WHERE day = NEW.day AND device = NEW.device AND conversation <> NEW.conversation) THEN RAISE(ABORT, 'CHAT_CONVERSATION_LIMIT') END;
  INSERT INTO chat_device_day (day, device, conversation, messages, first_msg_at) VALUES (NEW.day, NEW.device, NEW.conversation, 1, NEW.now)
    ON CONFLICT(day, device) DO UPDATE SET messages = messages + 1, conversation = NEW.conversation;
  INSERT INTO chat_ip_day VALUES (NEW.day, NEW.ip_hash, 1) ON CONFLICT(day, ip_hash) DO UPDATE SET messages = messages + 1;
  INSERT INTO chat_global_day VALUES (NEW.day, 1) ON CONFLICT(day) DO UPDATE SET messages = messages + 1;
END;
CREATE TRIGGER IF NOT EXISTS chat_admission_discard AFTER INSERT ON chat_admission BEGIN
  DELETE FROM chat_admission WHERE rowid = NEW.rowid;
END;

CREATE TABLE IF NOT EXISTS token_admission (day TEXT NOT NULL, ip_hash TEXT NOT NULL, ip_limit INTEGER NOT NULL);
CREATE TRIGGER IF NOT EXISTS token_admission_reserve BEFORE INSERT ON token_admission BEGIN
  SELECT CASE WHEN COALESCE((SELECT issued FROM token_ip_day WHERE day = NEW.day AND ip_hash = NEW.ip_hash), 0) >= NEW.ip_limit THEN RAISE(ABORT, 'TOKEN_IP_LIMIT') END;
  INSERT INTO token_ip_day VALUES (NEW.day, NEW.ip_hash, 1) ON CONFLICT(day, ip_hash) DO UPDATE SET issued = issued + 1;
END;
CREATE TRIGGER IF NOT EXISTS token_admission_discard AFTER INSERT ON token_admission BEGIN
  DELETE FROM token_admission WHERE rowid = NEW.rowid;
END;

-- Daily totals with no text and no identifiers: per-rung ok/fail/429, regenerated, fallback,
-- red_line, crisis, no_free_model, and model calls per rung (keyed by the provider's own reset day).
CREATE TABLE IF NOT EXISTS chat_counts (day TEXT NOT NULL, metric TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, metric));

INSERT OR IGNORE INTO schema_version (migration) VALUES ('0001_chat_limits');
