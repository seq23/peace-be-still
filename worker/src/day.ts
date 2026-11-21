// Every chat "day" is the Central-time calendar day, computed once on the server. A UTC day
// would reset free chat at 6 pm Central. Providers reset on their own clocks (Workers AI and
// OpenRouter at 00:00 UTC, Gemini at midnight Pacific), so their call counters use those.
const formatters = new Map<string, Intl.DateTimeFormat>();
export function dayIn(timeZone: string, now: number): string {
  let f = formatters.get(timeZone);
  if (!f) formatters.set(timeZone, (f = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })));
  return f.format(new Date(now));
}
export const centralDay = (now: number) => dayIn('America/Chicago', now);
export const utcDay = (now: number) => new Date(now).toISOString().slice(0, 10);
export const pacificDay = (now: number) => dayIn('America/Los_Angeles', now);
/** The Central day `days` before `now`'s Central day (calendar arithmetic, DST-safe). */
export function centralDayMinus(now: number, days: number): string {
  const [y, m, d] = centralDay(now).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - days)).toISOString().slice(0, 10);
}
