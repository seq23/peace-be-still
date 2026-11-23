-- Store review access, the device cap (src/review.ts; one contract with KeepMyProof, ApprovalPrep and Dream Wedding,
-- ~/Work/google-play-2026-11-21/REVIEW-UNLOCK-DESIGN.md section 3). Additive only.
-- review_grant: one row per install that redeemed the code under one code version (window_id). id_hash is a keyed
-- hash of the install id (HMAC with IP_HASH_SECRET), never the id itself. At most REVIEW_MAX_DEVICES rows per
-- window; the same install again takes no new row. Deleted 7 days after the grant ends (cleanup.ts).
CREATE TABLE IF NOT EXISTS review_grant (window_id TEXT NOT NULL, id_hash TEXT NOT NULL, granted_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, PRIMARY KEY (window_id, id_hash));
-- review_ip_day: per-IP counts for one Central day (ip_hash is the day-keyed HMAC of iphash.ts): kind 'try' (code
-- tries, 20 a day) and 'slot' (new installs, 2 a day). Deleted with the day counters (cleanup.ts).
CREATE TABLE IF NOT EXISTS review_ip_day (day TEXT NOT NULL, ip_hash TEXT NOT NULL, kind TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, ip_hash, kind));

INSERT OR IGNORE INTO schema_version (migration) VALUES ('0012_review_grant');
