-- A paid user's short private answers today (her ruling 21 Nov 2026): when free chat has nothing after
-- her private messages, the private model answers briefly, at most PAID_SHORT_ANSWERS_DAILY a day.
-- The anonymous install id, the Central day and a count; deleted within 48 hours (cleanup.ts).
CREATE TABLE IF NOT EXISTS chat_short_day (day TEXT NOT NULL, device TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, device));

INSERT OR IGNORE INTO schema_version (migration) VALUES ('0008_short_answers');
