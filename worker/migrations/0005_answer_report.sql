-- "Report this answer" (Apple Guideline 1.2, generative AI): the answer she reported, the reason she
-- picked and the time. Never her message, never an install id or IP. Deleted by the cron after 90
-- days (REPORT_DAYS in src/report.ts).
CREATE TABLE IF NOT EXISTS answer_report (
  at INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('hurtful', 'wrong', 'unsafe', 'other')),
  answer TEXT NOT NULL CHECK (length(answer) BETWEEN 1 AND 4000));
CREATE INDEX IF NOT EXISTS answer_report_at ON answer_report (at);

INSERT OR IGNORE INTO schema_version (migration) VALUES ('0005_answer_report');
