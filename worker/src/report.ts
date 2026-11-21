// "Report this answer" (Apple Guideline 1.2, generative AI): she can flag any AI answer. Only the
// answer text, the reason she picked and the time are kept, never her message, her install id or
// her IP, and the cron deletes reports after REPORT_DAYS. Read by a person in D1, nowhere else.
export const REPORT_REASONS = ['hurtful', 'wrong', 'unsafe', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
export const REPORT_DAYS = 90;
export const REPORTS_DAILY = 500; // all installs together: a flood cannot fill the table

export function parseReport(body: unknown): { answer: string; reason: ReportReason } | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (typeof b.answer !== 'string' || !b.answer.trim() || b.answer.length > 4000) return null;
  if (typeof b.reason !== 'string' || !(REPORT_REASONS as readonly string[]).includes(b.reason)) return null;
  return { answer: b.answer.trim(), reason: b.reason as ReportReason };
}

export async function saveReport(db: D1Database, report: { answer: string; reason: ReportReason }, now: number): Promise<void> {
  await db.prepare('INSERT INTO answer_report (at, reason, answer) VALUES (?, ?, ?)').bind(now, report.reason, report.answer).run();
}
