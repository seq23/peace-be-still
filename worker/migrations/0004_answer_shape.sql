-- Variety across answers (quality/variety.ts): the opening, closing and image pairs of the last
-- answers, per install (scope = install id) and for everyone (scope = 'all'), each stored ONLY as a
-- keyed 8-hex hash, never words. Pruned to the last 12 / 40 on insert; the cron deletes rows older
-- than 14 days; DELETE /api/memory removes her install's rows.
CREATE TABLE IF NOT EXISTS answer_shape (scope TEXT NOT NULL, at INTEGER NOT NULL, opener TEXT NOT NULL, closer TEXT NOT NULL, pairs TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS answer_shape_scope_at ON answer_shape (scope, at DESC);

INSERT OR IGNORE INTO schema_version (migration) VALUES ('0004_answer_shape');
