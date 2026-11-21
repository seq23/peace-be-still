// The daily reminder wired to the phone: the saved state (its own small record, so a player finishing outside React
// can mark first value), the expo-notifications adapter, the calm pre-ask card and the Settings section.
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Linking, Platform, Text, View } from 'react-native';
import { useT } from '../settings';
import { Body, Card, Label, PillButton, SwitchRow, TextLink, styles, usePalette } from '../ui';
import { fonts } from '../theme/tokens';
import {
  REMINDER_KEY, STEP_MINUTES, initialReminder, markFirstValue as withFirstValue, notNow as withNotNow, parseReminder,
  shiftTime, shouldOffer, sync, turnOff, turnOn, type NotificationsApi, type Permission, type ReminderContent, type ReminderState,
} from './reminder';

const isPreview = () => Platform.OS === 'web' && process.env.EXPO_PUBLIC_PBS_PREVIEW === '1';

/** Phones only. The CI web preview gets a stand-in that says yes, so reviewers can walk the flow; plain web has none. */
export function reminderApi(): NotificationsApi | null {
  if (Platform.OS === 'ios' || Platform.OS === 'android') return phoneApi();
  return isPreview() ? previewApi : null;
}

let phone: NotificationsApi | null = null;
function phoneApi(): NotificationsApi {
  if (phone) return phone;
  // Loaded only on a phone: the web bundle never needs the native module.
  const Notifications = require('expo-notifications') as typeof import('expo-notifications');
  // The reminder is for when the app is closed; while it is open, nothing pops up.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  const read = (p: { granted: boolean; canAskAgain: boolean; status: string }): Permission =>
    p.granted ? 'granted' : p.status === 'undetermined' && p.canAskAgain ? 'undetermined' : 'denied';
  phone = {
    getPermission: async () => read(await Notifications.getPermissionsAsync()),
    requestPermission: async () => read(await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: false, allowBadge: false } })),
    cancelAll: () => Notifications.cancelAllScheduledNotificationsAsync(),
    scheduleDaily: async (identifier, content, hour, minute) => {
      await Notifications.scheduleNotificationAsync({
        identifier,
        content: { title: content.title, body: content.body, sound: false },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
      });
    },
  };
  return phone;
}

let previewPermission: Permission = 'undetermined';
const previewApi: NotificationsApi = {
  getPermission: async () => previewPermission,
  requestPermission: async () => (previewPermission = 'granted'),
  cancelAll: async () => undefined,
  scheduleDaily: async () => undefined,
};

// One shared copy of the saved state, so the Today card, the declaration page and Settings agree at once.
let current: ReminderState = initialReminder;
let loaded: Promise<void> | null = null;
const listeners = new Set<() => void>();
function publish(next: ReminderState) {
  current = next;
  for (const l of listeners) l();
  void AsyncStorage.setItem(REMINDER_KEY, JSON.stringify(next)).catch(() => undefined);
}
function load(): Promise<void> {
  loaded ??= AsyncStorage.getItem(REMINDER_KEY)
    .then(value => { current = value ? parseReminder(JSON.parse(value)) : initialReminder; for (const l of listeners) l(); })
    .catch(() => undefined);
  return loaded;
}
/** Tests start each case from a clean phone. */
export function resetReminderForTests() { current = initialReminder; loaded = null; synced = false; previewPermission = 'undetermined'; }

/** A finished session: a night played to the end, or the day's declaration said. Safe to call from anywhere. */
export async function markFirstValue(now = Date.now()) {
  await load();
  if (current.firstValueAt === undefined) publish(withFirstValue(current, now));
}

const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
let synced = false;

export function useReminder() {
  // The reminder speaks the journey's language (Spanish inside Mi Refugio), like the screens it brings you back to.
  const t = useT('journey');
  const state = useSyncExternalStore(subscribe, () => current, () => current);
  const [ready, setReady] = useState(false);
  const api = reminderApi();
  const content: ReminderContent = { title: t('reminder.title'), body: t('reminder.body') };
  useEffect(() => {
    let live = true;
    void load().then(async () => {
      // Once per app open: the phone's schedule is made to match (clears anything stale, books the one reminder).
      if (api && !synced) { synced = true; const next = await sync(api, current, content); if (next !== current) publish(next); }
      if (live) setReady(true);
    });
    return () => { live = false; };
    // The language can change the text; the next open books it in the new language.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const run = useCallback(async (change: (s: ReminderState) => Promise<ReminderState> | ReminderState) => publish(await change(current)), []);
  return {
    state, ready, available: !!api,
    turnOn: () => api && run(s => turnOn(api, s, content)),
    turnOff: () => api && run(s => turnOff(api, s, content)),
    move: (minutes: number) => api && run(s => sync(api, shiftTime(s, minutes), content)),
    notNow: () => run(s => withNotNow(s)),
  };
}

/** The time as the phone shows it in the app's language (8:30 PM, 20:30). */
export const formatTime = (state: ReminderState, locale: string) =>
  new Intl.DateTimeFormat(locale === 'es' ? 'es-MX' : 'en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(2026, 0, 1, state.hour, state.minute));

/** Our own calm pre-ask, shown after first value. "Turn on" leads to the phone's prompt; "Not now" waits 7 days. */
export function ReminderOffer() {
  const t = useT('journey');
  const c = usePalette();
  const reminder = useReminder();
  if (!reminder.ready || !reminder.available || !shouldOffer(reminder.state)) return null;
  return (
    <Card>
      <View testID="reminder-offer" style={{ gap: 8 }}>
        <Label>{t('reminder.offer.label')}</Label>
        <Text style={{ fontFamily: fonts.serif, fontSize: 19, lineHeight: 26, color: c.ink }}>{t('reminder.offer.title')}</Text>
        <Body>{t('reminder.offer.body', { time: formatTime(reminder.state, t.locale) })}</Body>
        <PillButton onPress={() => void reminder.turnOn()}>{t('reminder.offer.yes')}</PillButton>
        <TextLink onPress={() => void reminder.notNow()}>{t('reminder.offer.notNow')}</TextLink>
      </View>
    </Card>
  );
}

/** Settings: one switch, the time, and (if the phone said no) how to allow it there. */
export function ReminderSettings() {
  const t = useT();
  const c = usePalette();
  const reminder = useReminder();
  if (!reminder.available) return null;
  const { state } = reminder;
  const time = formatTime(state, t.locale);
  return (
    <View style={{ gap: 10, marginTop: 10 }}>
      <SwitchRow title={t('reminder.settings.title')} detail={state.on ? t('reminder.settings.on', { time }) : t('reminder.settings.off')}
        value={state.on} onChange={on => void (on ? reminder.turnOn() : reminder.turnOff())} />
      {state.on && <Card>
        <View style={styles.row}>
          <View style={styles.grow}>
            <Label>{t('reminder.settings.time')}</Label>
            <Text style={{ fontFamily: fonts.mono, fontSize: 17, color: c.ink }}>{time}</Text>
          </View>
          <TextLink onPress={() => void reminder.move(-STEP_MINUTES)}>{t('reminder.settings.earlier')}</TextLink>
          <TextLink onPress={() => void reminder.move(STEP_MINUTES)} style={{ marginLeft: 16 }}>{t('reminder.settings.later')}</TextLink>
        </View>
      </Card>}
      {!state.on && state.osDenied && <Card>
        <Body>{t('reminder.settings.denied')}</Body>
        <TextLink onPress={() => void Linking.openSettings()}>{t('reminder.settings.openPhone')}</TextLink>
      </Card>}
    </View>
  );
}
