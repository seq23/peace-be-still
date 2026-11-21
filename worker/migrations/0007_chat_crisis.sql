-- A conversation flagged by the crisis check stays on the stronger private model while signals
-- continue, then returns to normal after 10 calm turns or 24 hours, whichever is first. No words are
-- kept: the anonymous install id, the conversation id, when it was last flagged, the calm turns
-- since, and whether the check-in question was asked. Deleted two days after the last flag.
CREATE TABLE IF NOT EXISTS chat_crisis (
  install_id TEXT NOT NULL, conversation TEXT NOT NULL, flagged_at INTEGER NOT NULL, calm INTEGER NOT NULL DEFAULT 0,
  asked INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (install_id, conversation));

INSERT OR IGNORE INTO schema_version (migration) VALUES ('0007_chat_crisis');
