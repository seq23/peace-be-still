-- Store review code tries per install per Central day (src/review.ts), so one person cannot use up the
-- reviewer's tries. Holds the install id like the other day counters, and goes with them (cleanup.ts).
CREATE TABLE IF NOT EXISTS review_try_day (day TEXT NOT NULL, install_id TEXT NOT NULL, tries INTEGER NOT NULL, PRIMARY KEY (day, install_id));

INSERT OR IGNORE INTO schema_version (migration) VALUES ('0011_review_tries');
