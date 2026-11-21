// The free lane's sleep nights (COMMON.md: "the first sleep night free, then 1 a week"; paid: every night).
// Counted on the phone only. A night runs from 6 AM to 6 AM local time, so a session started at 1 AM belongs to
// the evening before, and starting the same night's session again never costs a second night.
// The decision itself stays in the one gate, canUse('sleepSession', user); this file only feeds it the counts.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import type { Track } from '../../player/library';

export const NIGHTS_KEY = 'peace-be-still-sleep-nights';
const NIGHT_STARTS_HOUR = 6;
const DAY_MS = 86_400_000;

/** Sleep sessions are the whispered Psalm Nights and Imagination Nights; Bible chapters and stories stay free. */
export function isSleepSession(track: Pick<Track, 'kind'>): boolean {
  return track.kind === 'psalm-night' || track.kind === 'imagination-night';
}

/** The night a moment belongs to, as a local calendar date "YYYY-MM-DD" (the evening's date). */
export function nightOf(now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - NIGHT_STARTS_HOUR);
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

const dateOf = (night: string) => { const [y, m, d] = night.split('-').map(Number); return new Date(y, m - 1, d); };
const daysBetween = (a: string, b: string) => Math.round((dateOf(b).getTime() - dateOf(a).getTime()) / DAY_MS);

/** The nights counted so far, oldest first: the first night ever, then the weekly ones. */
export type NightLog = string[];

/** What canUse needs, from the log. The first night is a gift of its own; the week is the 7 nights up to tonight. */
export function sleepUsage(log: NightLog, now: Date) {
  const tonight = nightOf(now);
  const [first, ...weekly] = log;
  return {
    firstSleepUsed: first !== undefined && first !== tonight,
    sleepSessionsThisWeek: weekly.filter(night => night !== tonight && daysBetween(night, tonight) < 7).length,
  };
}

/** The evening of the next free night once this week's is used (a date at local midnight). */
export function nextFreeNight(log: NightLog, now: Date): Date {
  const last = log.at(-1) ?? nightOf(now);
  const next = dateOf(last);
  next.setDate(next.getDate() + 7);
  return next;
}

/** Tonight counted, once. Kept short: the first night and the last few are all the rule ever reads. */
export function recordNight(log: NightLog, now: Date): NightLog {
  const tonight = nightOf(now);
  if (log.includes(tonight)) return log;
  const next = [...log, tonight];
  return next.length > 9 ? [next[0], ...next.slice(-8)] : next;
}

export function parseLog(raw: string | null): NightLog {
  try {
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x)) : [];
  } catch {
    return [];
  }
}

/**
 * The web preview's night switch, like the preview paid flag (`?paid=1`): `?nights=used` stores a used week
 * (the first night 10 nights ago, this week's 2 nights ago) and `?nights=new` clears the log. Preview only.
 */
export function previewNights(now: Date, preview: boolean): NightLog | 'clear' | null {
  if (!preview) return null;
  try {
    const asked = new URLSearchParams((globalThis as { location?: Location }).location?.search ?? '').get('nights');
    const ago = (n: number) => nightOf(new Date(now.getTime() - n * DAY_MS));
    return asked === 'used' ? [ago(10), ago(2)] : asked === 'new' ? 'clear' : null;
  } catch {
    return null;
  }
}

/** The log on this phone. `ready` is false until it is read, so nothing is locked or granted on a guess. */
export function useSleepNights(preview = false) {
  const [log, setLog] = useState<NightLog | null>(null);
  useEffect(() => {
    let live = true;
    const asked = previewNights(new Date(), preview);
    const read = asked === null ? AsyncStorage.getItem(NIGHTS_KEY).then(parseLog)
      : asked === 'clear' ? AsyncStorage.removeItem(NIGHTS_KEY).then(() => [])
      : AsyncStorage.setItem(NIGHTS_KEY, JSON.stringify(asked)).then(() => asked);
    read.then(value => { if (live) setLog(value); }, () => { if (live) setLog([]); });
    return () => { live = false; };
  }, [preview]);
  const record = useCallback((now: Date) => {
    setLog(current => {
      const next = recordNight(current ?? [], now);
      if (next !== current) void AsyncStorage.setItem(NIGHTS_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);
  return { ready: log !== null, log: log ?? [], record };
}
