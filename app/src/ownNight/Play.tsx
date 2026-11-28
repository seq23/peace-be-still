// A saved night playing: always on night, the screen dims, her moment said softly over the quiet bed with long
// gaps, quieter each time, then the bed fades out at the chosen length. It is a sleep session through the one gate.
import { useIsFocused } from 'expo-router';
import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { canUse } from '../gates';
import { noTracking } from '../ui';
import { expoBrightness } from '../player/adapters';
import { createDimmer } from '../player/dimmer';
import { usePlayer } from '../player/usePlayer';
import { usePurchases } from '../purchases/provider';
import { markFirstValue } from '../reminders';
import { isListenPreview } from '../screens/listen/preview';
import { sleepUsage, useSleepNights } from '../screens/listen/nights';
import { useSettings, useT } from '../settings';
import { fonts, night as colors } from '../theme/tokens';
import { bedOutput, phoneVoice, recordingVoice } from './adapters';
import { createNight, spokenSeconds, type Night } from './night';
import type { SavedNight } from './saved';

export function OwnNightPlay({ night, close, make = makeNight }: { night: SavedNight; close: () => void; make?: (night: SavedNight, title: string, onFinish: () => void) => Night }) {
  const t = useT('journey');
  const { settings } = useSettings();
  const { paid, known } = usePurchases();
  const nights = useSleepNights(isListenPreview());
  const { player, state: library } = usePlayer();
  const [runner] = useState(() => make(night, t('ownNight.player'), () => void markFirstValue()));
  const state = useSyncExternalStore(runner.subscribe, runner.getState);
  const [dimmer] = useState(() => createDimmer(expoBrightness));
  const dimmed = useSyncExternalStore(dimmer.subscribe, () => dimmer.dimmed);
  const focused = useIsFocused();
  useEffect(() => { dimmer.setActive(focused && state.playing); }, [dimmer, focused, state.playing]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', next => { if (next === 'active') runner.foreground(); });
    return () => { sub.remove(); runner.stop(); void dimmer.release(); };
  }, [runner, dimmer]);
  // The one sleep-session gate (paid: every night). Nothing is granted until the store and the night log have answered.
  const user = { paid, age: settings.age, ...sleepUsage(nights.log, new Date()) };
  const allowed = known && nights.ready && canUse('ownNight', user) && canUse('sleepSession', user);
  const endsAt = useMemo(() => state.endsAt ? new Intl.DateTimeFormat(t.locale === 'es' ? 'es-MX' : 'en-US', { hour: 'numeric', minute: '2-digit' }).format(state.endsAt) : null, [state.endsAt, t.locale]);

  function toggle() {
    dimmer.touch();
    if (state.playing) { runner.stop(); return; }
    if (!allowed) return;
    if (library.playing) void player.pause(); // one sound at a time
    runner.start(night.minutes);
    if (!paid) nights.record(new Date()); // a night is spent only by the free lane (never reached: paid only)
  }

  const voiceLabel = t(night.voice === 'mine' ? 'ownNight.myVoiceLabel' : 'ownNight.phoneVoiceLabel');
  return <SafeAreaView style={s.screen}>
    <ScrollView contentContainerStyle={s.content} onTouchStart={() => dimmer.touch()}>
      <Pressable onPress={() => { runner.stop(); close(); }} accessibilityRole="button" style={s.control}>
        <Text style={s.link}>{t('listen.close')}</Text>
      </Pressable>
      <View style={s.heading}>
        <Text style={[s.tag, noTracking(t('journey.livingInTheEnd.name'))]}>{t('journey.livingInTheEnd.name')}</Text>
        <Text accessibilityRole="header" style={s.title}>{t('ownNight.player')}</Text>
        <Text style={s.note}>{[t('listen.minutes', { minutes: night.minutes }), voiceLabel, ...(night.ai ? [t('ownNight.aiLabel')] : [])].join(' · ')}</Text>
      </View>
      <Text style={s.scene}>{night.scene}</Text>
      <Text accessibilityLiveRegion="polite" style={s.note}>
        {state.error === 'voice' ? t('ownNight.voiceFailed') : state.playing && endsAt ? t('ownNight.endsAt', { time: endsAt }) : state.finished ? t('ownNight.ended') : t('ownNight.ready', { minutes: night.minutes })}
      </Text>
      <Pressable onPress={toggle} disabled={!state.playing && !allowed} accessibilityRole="button" accessibilityState={{ disabled: !state.playing && !allowed }}
        style={[s.pill, !state.playing && !allowed && { opacity: 0.55 }]}>
        <Text style={s.pillText}>{state.playing ? t('ownNight.stopNight') : t('ownNight.start')}</Text>
      </Pressable>
    </ScrollView>
    {dimmed && <Pressable accessibilityRole="button" accessibilityLabel={t('listen.brighten')} onPress={() => dimmer.touch()} style={s.dim} />}
  </SafeAreaView>;
}

function makeNight(night: SavedNight, title: string, onFinish: () => void): Night {
  const mine = night.voice === 'mine' && !!night.recording;
  return createNight({
    bed: bedOutput(title),
    voice: mine ? recordingVoice(night.recording!) : phoneVoice(night.scene, night.lang),
    sayS: mine ? night.recordingSeconds ?? 20 : spokenSeconds(night.scene),
    onFinish,
  });
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { width: '100%', maxWidth: 520, alignSelf: 'center', flexGrow: 1, padding: 24, gap: 22 },
  control: { minHeight: 44, justifyContent: 'center' },
  link: { color: colors.glow, fontFamily: fonts.strong, fontSize: 16 },
  heading: { gap: 6, marginTop: 34, alignItems: 'center' },
  tag: { fontFamily: fonts.mono, color: colors.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.4, textAlign: 'center' },
  title: { fontFamily: fonts.serif, color: colors.ink, fontSize: 21, lineHeight: 27, textAlign: 'center' },
  note: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  scene: { color: colors.ink, fontFamily: fonts.serif, fontSize: 21, lineHeight: 31, textAlign: 'center', marginVertical: 16 },
  pill: { minHeight: 52, borderRadius: 26, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.glow, marginTop: 'auto' },
  pillText: { color: colors.bg, fontFamily: fonts.strong, fontSize: 16 },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(14,26,34,0.88)' },
});
