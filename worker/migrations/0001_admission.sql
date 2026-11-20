-- A single insert reserves all three limits atomically, including under concurrency.
CREATE TABLE chat_device_day (day TEXT NOT NULL, device TEXT NOT NULL, conversation TEXT NOT NULL, messages INTEGER NOT NULL, PRIMARY KEY (day, device));
CREATE TABLE chat_ip_day (day TEXT NOT NULL, ip_hash TEXT NOT NULL, messages INTEGER NOT NULL, PRIMARY KEY (day, ip_hash));
CREATE TABLE chat_global_day (day TEXT PRIMARY KEY, messages INTEGER NOT NULL);
CREATE TABLE chat_admission (day TEXT NOT NULL, device TEXT NOT NULL, conversation TEXT NOT NULL, ip_hash TEXT NOT NULL, paid INTEGER NOT NULL, ip_limit INTEGER NOT NULL, global_limit INTEGER NOT NULL);
CREATE TRIGGER chat_admission_reserve BEFORE INSERT ON chat_admission BEGIN
  SELECT CASE WHEN COALESCE((SELECT messages FROM chat_global_day WHERE day = NEW.day), 0) >= NEW.global_limit THEN RAISE(ABORT, 'CHAT_GLOBAL_LIMIT') END;
  SELECT CASE WHEN COALESCE((SELECT messages FROM chat_ip_day WHERE day = NEW.day AND ip_hash = NEW.ip_hash), 0) >= NEW.ip_limit THEN RAISE(ABORT, 'CHAT_IP_LIMIT') END;
  SELECT CASE WHEN COALESCE((SELECT messages FROM chat_device_day WHERE day = NEW.day AND device = NEW.device), 0) >= CASE WHEN NEW.paid = 1 THEN 100 ELSE 10 END THEN RAISE(ABORT, 'CHAT_DEVICE_LIMIT') END;
  SELECT CASE WHEN NEW.paid = 0 AND EXISTS (SELECT 1 FROM chat_device_day WHERE day = NEW.day AND device = NEW.device AND conversation <> NEW.conversation) THEN RAISE(ABORT, 'CHAT_CONVERSATION_LIMIT') END;
  INSERT INTO chat_device_day VALUES (NEW.day, NEW.device, NEW.conversation, 1) ON CONFLICT(day, device) DO UPDATE SET messages = messages + 1;
  INSERT INTO chat_ip_day VALUES (NEW.day, NEW.ip_hash, 1) ON CONFLICT(day, ip_hash) DO UPDATE SET messages = messages + 1;
  INSERT INTO chat_global_day VALUES (NEW.day, 1) ON CONFLICT(day) DO UPDATE SET messages = messages + 1;
END;
CREATE TRIGGER chat_admission_discard AFTER INSERT ON chat_admission BEGIN
  DELETE FROM chat_admission WHERE rowid = NEW.rowid;
END;
