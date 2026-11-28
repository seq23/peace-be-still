// The phone's clock, in one place, so a test can set the hour and the web preview can show the small hours.
// The small hours (12 AM to 4:59 AM, phone time) are when the app goes dark everywhere and Today and Nights offer
// only "3 AM, back to sleep" (her brief 21 Nov 2026). 10 PM and 6 AM are outside; so is 5:00 AM.

export const SMALL_HOURS = { from: 0, until: 5 } as const;

/**
 * The web preview's hour switch, like `?paid=1` and `?nights=used`: `?hour=3` shows the app as it is at 3 AM.
 * A `pbs-preview-hour` storage value does the same for every page of the visit.
 * Preview only (EXPO_PUBLIC_PBS_PREVIEW=1 on the web); a phone or store build always reads the real clock.
 */
export function previewHour(): number | null {
  if (process.env.EXPO_PUBLIC_PBS_PREVIEW !== '1') return null;
  const valid = (raw: string | null | undefined) => {
    const hour = raw === null || raw === undefined || raw === '' ? NaN : Number(raw);
    return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : null;
  };
  try {
    // Only the web has a page address; a phone has no `location`, so it never reads one.
    const search = (globalThis as { location?: Location }).location?.search;
    if (typeof search !== 'string') return null;
    const asked = valid(new URLSearchParams(search).get('hour'));
    if (asked !== null) return asked;
    // A tap-through flow states its hour in storage (PREVIEW_HOUR_KEY), so a page it reaches by tapping keeps that
    // hour; without it the robot's browser ran on the runner's UTC clock, and a main push between 6 and 11 PM
    // Central met the small hours (27 Nov 2026: Today and Nights showed only "back to sleep").
    return valid((globalThis as { localStorage?: Storage }).localStorage?.getItem(PREVIEW_HOUR_KEY));
  } catch {
    return null;
  }
}

/** The preview's remembered hour (web preview only, set by a tap-through flow's storage; `?hour=` wins over it). */
export const PREVIEW_HOUR_KEY = 'pbs-preview-hour';

export const clock = {
  now(): Date {
    const now = new Date();
    const hour = previewHour();
    if (hour !== null) now.setHours(hour, 12, 0, 0);
    return now;
  },
};

/**
 * `endsAt` ends the small hours earlier than 5:00 for one person: 새벽기도's dawn time. Someone who asked to be
 * called to prayer at 4:30 is up on purpose; from that minute Today is her dawn page, not "back to sleep".
 * A later time never stretches the small hours past 5:00.
 */
export function inSmallHours(date: Date, endsAt?: { hour: number; minute: number }): boolean {
  const minute = date.getHours() * 60 + date.getMinutes();
  const end = Math.min(SMALL_HOURS.until * 60, endsAt ? endsAt.hour * 60 + endsAt.minute : Infinity);
  return minute >= SMALL_HOURS.from * 60 && minute < end;
}
