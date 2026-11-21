// The phone's clock, in one place, so a test can set the hour and the web preview can show the small hours.
// The small hours (12 AM to 4:59 AM, phone time) are when the app goes dark everywhere and Today and Nights offer
// only "3 AM, back to sleep" (her brief 21 Nov 2026). 10 PM and 6 AM are outside; so is 5:00 AM.

export const SMALL_HOURS = { from: 0, until: 5 } as const;

/**
 * The web preview's hour switch, like `?paid=1` and `?nights=used`: `?hour=3` shows the app as it is at 3 AM.
 * Preview only (EXPO_PUBLIC_PBS_PREVIEW=1 on the web); a phone or store build always reads the real clock.
 */
export function previewHour(): number | null {
  if (process.env.EXPO_PUBLIC_PBS_PREVIEW !== '1') return null;
  try {
    // Only the web has a page address; a phone has no `location`, so it never reads one.
    const search = (globalThis as { location?: Location }).location?.search;
    if (typeof search !== 'string') return null;
    const raw = new URLSearchParams(search).get('hour');
    const hour = raw === null || raw === '' ? NaN : Number(raw);
    return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
  } catch {
    return null;
  }
}

export const clock = {
  now(): Date {
    const now = new Date();
    const hour = previewHour();
    if (hour !== null) now.setHours(hour, 12, 0, 0);
    return now;
  },
};

export function inSmallHours(date: Date): boolean {
  const hour = date.getHours();
  return hour >= SMALL_HOURS.from && hour < SMALL_HOURS.until;
}
