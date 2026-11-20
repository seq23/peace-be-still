// Daily totals, never text and never ids (QUALITY: regenerated, fallback, red_line, crisis; plus
// per-rung ok/fail/429 and model calls). Logs carry codes only.
export async function bump(db: D1Database, day: string, metric: string, by = 1): Promise<void> {
  await db.prepare('INSERT INTO chat_counts (day, metric, n) VALUES (?, ?, ?) ON CONFLICT(day, metric) DO UPDATE SET n = n + excluded.n').bind(day, metric, by).run();
}
/** Takes one unit of a daily allowance; false when it is used up. Atomic under concurrency. */
export async function reserve(db: D1Database, day: string, metric: string, cap: number): Promise<boolean> {
  if (!(cap > 0)) return false;
  const row = await db.prepare('INSERT INTO chat_counts (day, metric, n) VALUES (?, ?, 1) ON CONFLICT(day, metric) DO UPDATE SET n = n + 1 WHERE n < ? RETURNING n')
    .bind(day, metric, cap).first<{ n: number }>();
  return row !== null;
}
export function logCode(code: string, extra: Record<string, string | number | boolean> = {}): void {
  console.log(JSON.stringify({ code, ...extra }));
}
