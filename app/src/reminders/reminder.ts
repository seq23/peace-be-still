// The daily reminder: at most ONE local notification a day, only after the person has said yes. Local only: no push
// server, no token, nothing leaves the phone. This file is the logic; index.tsx wires it to the phone and screens.
//
// One rule keeps it to one a day: every sync clears the whole schedule first, then (if on and allowed) books the
// single daily reminder under one fixed id. Reopening the app, a reinstall leaving an old entry behind, a new time
// or a new time zone all go through the same clear-then-book, so nothing can stack.

export const REMINDER_KEY = 'peace-be-still-reminder';
export const REMINDER_ID = 'pbs-daily-reminder';
const DAY = 86_400_000;
/** "Not now" on our own pre-ask: we don't offer again for at least this long. */
export const ASK_AGAIN_MS = 7 * DAY;
/**
 * The default time follows the journey: Morning Word is a morning practice (7:00 AM); 새벽기도 is the dawn prayer
 * (5:00 AM, the hour Korean churches meet); every other journey leads to the night session, so its reminder is early
 * evening (8:30 PM), before bedtime, never at it. A time the person picks replaces the default.
 */
export type ReminderKind = 'dawn' | 'morning' | 'evening';
export const DEFAULT_TIMES: Record<ReminderKind, { hour: number; minute: number }> = {
  dawn: { hour: 5, minute: 0 }, morning: { hour: 7, minute: 0 }, evening: { hour: 20, minute: 30 },
};
export const reminderKind = (journey?: string | null): ReminderKind =>
  journey === 'saebyeok' ? 'dawn' : journey === 'morning-word' || journey === 'morning-word-mindset' ? 'morning' : 'evening';

export type Permission = 'granted' | 'denied' | 'undetermined';

export type ReminderState = {
  on: boolean;
  /** The time the person picked; unset means the journey's default. */
  hour?: number;
  minute?: number;
  /** The first finished session (a night played to the end, or the day's declaration said). Before it, no offer. */
  firstValueAt?: number;
  /** When "Not now" was tapped on our pre-ask. */
  notNowAt?: number;
  /** The phone said no. We never ask the phone again; Settings shows how to turn it on there. */
  osDenied?: boolean;
};

export const initialReminder: ReminderState = { on: false };

/** The time the reminder rings: the person's pick, else the journey's default. */
export const timeOf = (state: ReminderState, kind: ReminderKind) =>
  state.hour !== undefined && state.minute !== undefined ? { hour: state.hour, minute: state.minute } : DEFAULT_TIMES[kind];

/** What the reminder says, and which journey kind it belongs to (that sets the default time). */
export type ReminderContent = { title: string; body: string; kind: ReminderKind };

/** What the app needs from the phone's notification system (expo-notifications on a phone; a fake in tests). */
export type NotificationsApi = {
  getPermission(): Promise<Permission>;
  /** Shows the phone's own prompt. Called only from turnOn, which only a tap reaches. */
  requestPermission(): Promise<Permission>;
  cancelAll(): Promise<void>;
  scheduleDaily(id: string, content: ReminderContent, hour: number, minute: number): Promise<void>;
};

const isTime = (hour: unknown, minute: unknown) =>
  Number.isInteger(hour) && Number.isInteger(minute) && (hour as number) >= 0 && (hour as number) < 24 && (minute as number) >= 0 && (minute as number) < 60;

const CLOCK_LOCALE: Record<string, string> = { es: 'es-MX', ko: 'ko-KR', 'zh-Hans': 'zh-CN', 'zh-Hant': 'zh-TW' };
/** The time as the phone shows it in the app's language (8:30 PM, 8:30 p.m., 오전 5:00, 上午5:00). */
export const formatTime = (time: { hour: number; minute: number }, locale: string) =>
  new Intl.DateTimeFormat(CLOCK_LOCALE[locale] ?? 'en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(2026, 0, 1, time.hour, time.minute));

/** Reads what was saved; anything unreadable falls back to off at the default time. */
export function parseReminder(raw: unknown): ReminderState {
  const saved = (raw && typeof raw === 'object' ? raw : {}) as Partial<ReminderState>;
  const time = isTime(saved.hour, saved.minute) ? { hour: saved.hour!, minute: saved.minute! } : {};
  const at = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : undefined);
  return {
    on: saved.on === true,
    ...time,
    ...(at(saved.firstValueAt) !== undefined && { firstValueAt: at(saved.firstValueAt) }),
    ...(at(saved.notNowAt) !== undefined && { notNowAt: at(saved.notNowAt) }),
    ...(saved.osDenied === true && { osDenied: true }),
  };
}

/** Our calm pre-ask shows only after first value, never while it is on or the phone said no, and not within 7 days of "Not now". */
export function shouldOffer(state: ReminderState, now = Date.now()): boolean {
  if (state.on || state.osDenied || state.firstValueAt === undefined) return false;
  return state.notNowAt === undefined || now - state.notNowAt >= ASK_AGAIN_MS;
}

export const markFirstValue = (state: ReminderState, now = Date.now()): ReminderState =>
  state.firstValueAt === undefined ? { ...state, firstValueAt: now } : state;

export const notNow = (state: ReminderState, now = Date.now()): ReminderState => ({ ...state, notNowAt: now });

/** A time from the phone's picker; anything out of range is ignored. */
export const withTime = (state: ReminderState, hour: number, minute: number): ReminderState =>
  isTime(hour, minute) ? { ...state, hour, minute } : state;

/**
 * Makes the phone's schedule match the state: clear everything, then book the one reminder if it is on and the
 * phone allows it. Never prompts. If the phone has since said no, the state turns off and remembers that.
 * A failing notification system never crashes the app: the state comes back unchanged and the error is logged.
 */
export async function sync(api: NotificationsApi, state: ReminderState, content: ReminderContent): Promise<ReminderState> {
  try {
    await api.cancelAll();
    if (!state.on) return state;
    const permission = await api.getPermission();
    if (permission !== 'granted') return { ...state, on: false, ...(permission === 'denied' && { osDenied: true }) };
    const { hour, minute } = timeOf(state, content.kind);
    await api.scheduleDaily(REMINDER_ID, { title: content.title, body: content.body, kind: content.kind }, hour, minute);
    return { ...state, osDenied: undefined };
  } catch (error) {
    console.warn('Daily reminder could not be updated', error);
    return state;
  }
}

/**
 * The only path to the phone's prompt, reached from a tap ("Turn on" on our pre-ask, or the Settings switch).
 * If the phone already said no, it is not asked again: we re-read the permission (they may have allowed it in the
 * phone's Settings) and otherwise stay off.
 */
export async function turnOn(api: NotificationsApi, state: ReminderState, content: ReminderContent, now = Date.now()): Promise<ReminderState> {
  try {
    let permission = await api.getPermission();
    if (permission === 'undetermined') permission = await api.requestPermission();
    if (permission === 'granted') return sync(api, { ...state, on: true, osDenied: undefined }, content);
    if (permission === 'denied') return { ...state, on: false, osDenied: true };
    return { ...state, on: false, notNowAt: now };
  } catch (error) {
    console.warn('Daily reminder could not be turned on', error);
    return { ...state, on: false };
  }
}

/** Off clears every scheduled notification at once. */
export const turnOff = (api: NotificationsApi, state: ReminderState, content: ReminderContent) => sync(api, { ...state, on: false }, content);
