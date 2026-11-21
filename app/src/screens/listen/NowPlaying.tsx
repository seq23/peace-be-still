import { useIsFocused, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
import { bible, formatReference, parseReference, type Verse } from '../../bible';
import { canUse } from '../../gates';
import { hasCallAndResponse, trackTitle, type Track } from '../../player/library';
import { SLEEP_MINUTES, type SleepMinutes } from '../../player/player';
import { useDimmer, usePlayer } from '../../player/usePlayer';
import { useSettings, useT } from '../../settings';
import { dawn, fonts, night } from '../../theme/tokens';
import { ScriptureText } from '../../ui/scripture';
import { shelfOf } from './catalog';
import { usePublishedAudio } from './availability';
import { downloadAvailable, useOffline } from './offline';
import { isListenPreview, isPreviewSample } from './preview';
import { usePurchases } from '../../purchases/provider';
import { isSleepSession, nextFreeNight, sleepUsage, useSleepNights } from './nights';
import { isBackToSleep } from './hush';

/** The 3 AM back-to-sleep night goes dark 3 s after the last touch, not 15. */
const HUSH_DIM_AFTER_MS = 3_000;

/** "Friday, November 28" / "viernes 28 de noviembre" (Spanish takes no comma after the weekday). */
function freeNightLabel(date: Date, locale: string) {
  if (locale !== 'es') return new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(date);
  const part = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-MX', o).format(date);
  return `${part({ weekday: 'long' })} ${part({ day: 'numeric', month: 'long' })}`;
}

function clock(seconds: number) {
  return [Math.floor(seconds / 60), String(Math.floor(seconds % 60)).padStart(2, '0')].join(':');
}

export function NowPlaying({ track, close, autoplay = false }: { track: Track; close: () => void; autoplay?: boolean }) {
  const t = useT('journey');
  const { settings } = useSettings();
  const user = useOffline(settings.age);
  const { player, state, stop } = usePlayer();
  const router = useRouter();
  const nights = useSleepNights(isListenPreview());
  const [timerOpen, setTimerOpen] = useState(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    if (state.sleepEndsAt === null) return;
    setNow(Date.now());
    const refresh = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(refresh);
  }, [state.sleepEndsAt]);
  const [playPending, setPlayPending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [downloadFailed, setDownloadFailed] = useState(false);
  const playRequest = useRef(false);
  const pausedHere = useRef(false);
  const downloadRequest = useRef(false);
  const current = state.track?.file === track.file;
  const playing = current && state.playing;
  const response = current ? state.response : null;
  const focused = useIsFocused();
  // The 3 AM back-to-sleep night: it starts from the one button, dims at once, has no timer (it stops by itself).
  const hush = isBackToSleep(track);
  const { dimmed, touch } = useDimmer(focused && playing && response === null, hush ? HUSH_DIM_AFTER_MS : undefined);
  const offlineAllowed = canUse('offline', user);
  const saved = offlineAllowed && (downloaded || downloadAvailable(track, user));
  const published = usePublishedAudio();
  const canStream = !stop && !isPreviewSample(track) && published?.get(track.file) === track.sha256;
  const unavailable = !saved && !canStream;
  const shelf = shelfOf(track);
  // Sleep sessions: the first night free, then one a week; paid, every night. The one gate decides.
  const sleep = isSleepSession(track);
  // Nothing is locked or granted until both the night log and the store's answer are in, so a subscriber
  // never sees the free lane's lock while RevenueCat is still answering.
  const { known } = usePurchases();
  const nightsKnown = nights.ready && known;
  const usage = sleepUsage(nights.log, new Date());
  const nightAllowed = !sleep || (nightsKnown && canUse('sleepSession', { ...user, ...usage }));
  const nightLocked = sleep && nightsKnown && !nightAllowed && !current;
  const nextNight = freeNightLabel(nextFreeNight(nights.log, new Date()), t.locale);
  const child = settings.age === 'child';
  const protectedPauses = hasCallAndResponse(track);
  const untimedResponses = protectedPauses && !track.responsePauses;
  const translation = track.lang === 'es' ? 'RV1909' : 'KJV';
  const excerptRef = track.kind === 'psalms' ? track.ref : track.scriptureRef;
  const [excerpt, setExcerpt] = useState<{ track: Track; verse: Verse } | null>(null);
  const verse = excerpt?.track === track ? excerpt.verse : null;
  useEffect(() => {
    const ref = excerptRef && parseReference(excerptRef);
    if (!ref) return;
    let active = true;
    void bible(translation).then(async store => {
      const verse = await store.verse(ref.book, ref.chapter, ref.verse ?? (ref.book === 'PSA' && ref.chapter === 23 ? 2 : 1));
      if (active) setExcerpt(verse ? { track, verse } : null);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [excerptRef, track, translation]);
  const label = shelf === 'psalms' ? t('journey.psalmNights.name')
    : shelf === 'imagination' ? t('journey.imaginationNights.name')
    : shelf === 'hushHarbor' ? [t('journey.hushHarbor.name'), t('journey.hushHarbor.subtitle')].join(' · ')
    : shelf === 'miRefugio' ? [t('journey.miRefugio.name'), t('journey.miRefugio.subtitle')].join(' · ')
    : shelf === 'grief' ? t('grief.name') : shelf === 'backToSleep' ? t('hush.label') : t('listen.bibleByBook');
  const minutes = state.sleepEndsAt === null ? null : Math.max(1, Math.ceil((state.sleepEndsAt - now) / 60_000));
  const position = current ? Math.min(track.seconds, state.position) : 0;
  const progress = Math.floor(position / track.seconds * 100);

  async function toggle() {
    if (playRequest.current || (unavailable && !playing) || (!current && !nightAllowed)) return;
    touch();
    playRequest.current = true;
    setPlayPending(true);
    try {
      if (playing) {
        await player.pause();
        pausedHere.current = true;
      } else if (current && pausedHere.current) {
        player.resume();
        pausedHere.current = false;
      } else {
        await player.play(track, user);
        // A night is spent only by the free lane, and only once the session really started.
        const after = player.getState();
        if (sleep && !user.paid && after.playing && !after.error && after.track?.file === track.file) nights.record(new Date());
      }
    } finally {
      playRequest.current = false;
      setPlayPending(false);
    }
  }

  // The one button already asked to play: start once the audio is known to be there (never a locked night: it is free).
  const autoplayed = useRef(false);
  useEffect(() => {
    if (!autoplay || !hush || autoplayed.current || unavailable || current) return;
    autoplayed.current = true;
    void toggle();
  });

  async function download() {
    if (!offlineAllowed || !canStream || saved || downloadRequest.current) return;
    downloadRequest.current = true;
    setDownloading(true);
    setDownloadFailed(false);
    try {
      const ok = await player.download(track, user);
      setDownloaded(ok);
      setDownloadFailed(!ok);
    } finally {
      downloadRequest.current = false;
      setDownloading(false);
    }
  }

  function chooseTimer(value: SleepMinutes | null) {
    player.setSleepTimer(value);
    setTimerOpen(false);
    touch();
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} onTouchStart={touch}>
        <Pressable onPress={close} accessibilityRole="button" style={styles.control}>
          <Text style={styles.link}>{t('listen.close')}</Text>
        </Pressable>
        {/* Screen 4: the title block near the top, the verse under it, the controls at the foot. A track with
            no verse (Imagination Nights) centres its title instead of leaving a hole. */}
        <View style={[styles.heading, !excerptRef && styles.headingAlone]}>
          <Text style={styles.tag}>{label}</Text>
          <Text accessibilityRole="header" style={styles.title}>{trackTitle(track, t.locale)}</Text>
          <Text style={styles.note}>{t('listen.minutes', { minutes: Math.max(1, Math.round(track.seconds / 60)) })} · {t('listen.aiVoice')}</Text>
        </View>
        {verse && <View style={styles.verse}>
          <ScriptureText text={verse.text} style={styles.verseText} testID="scripture-text" />
          <Text style={styles.reference}>{track.kind === 'psalms' ? `${trackTitle(track, t.locale)}:${verse.verse}` : formatReference(verse, t.locale)} · {translation}</Text>
        </View>}
        {untimedResponses && <View style={styles.responses}>
          <Text style={styles.note}>{t('listen.respondDuringPauses')}</Text>
          <Text style={styles.response}>{t('listen.responseFirst')}</Text>
          <Text style={styles.response}>{t('listen.responseSecond')}</Text>
        </View>}
        {track.responsePauses && <View style={styles.cue}>
          <Text accessibilityLiveRegion="polite" style={styles.response}>
            {response === null ? '' : t(response === 0 ? 'listen.responseFirst' : 'listen.responseSecond')}
          </Text>
        </View>}
        <View style={styles.progress}>
          <View accessibilityRole="progressbar" accessibilityLabel={t('listen.progress')}
            accessibilityValue={{ min: 0, max: 100, now: progress }} style={styles.rail}>
            <View style={[styles.fill, { width: `${progress}%` }]} />
            <View style={[styles.thumb, { left: `${progress}%` }]} />
          </View>
          <View style={styles.times}>
            <Text style={styles.time}>{clock(position)}</Text>
            <Text style={styles.time}>{clock(track.seconds)}</Text>
          </View>
        </View>
        {unavailable && !nightLocked && <Text accessibilityRole="alert" style={styles.note}>{t('listen.audioNotReady')}</Text>}
        {!unavailable && current && state.error === 'play-failed' &&
          <Text accessibilityRole="alert" style={styles.note}>{t(saved ? 'listen.playFailed' : 'listen.playFailedNetwork')}</Text>}
        {nightLocked ? <View style={styles.locked}>
          <Text accessibilityRole="text" style={styles.lockedLine}>{t('listen.nextFreeNight', { day: nextNight })}</Text>
          {!child && <Text style={styles.note}>{t('listen.everyNight')}</Text>}
          {!child && <Pressable accessibilityRole="button" style={styles.pill} onPress={() => router.push('/paid')}>
            <Text style={styles.pillText}>{t('listen.seePlans')}</Text>
          </Pressable>}
        </View> : <>
        <View style={styles.transport}>
          {!protectedPauses && <Pressable disabled={!current || unavailable || playPending || !!state.error}
            accessibilityRole="button" accessibilityLabel={t('listen.back15')} style={styles.skip}
            onPress={() => { void player.skip(-15).catch(() => undefined); }}>
            <Text style={styles.skipText}>−15</Text>
          </Pressable>}
          <Pressable onPress={() => void toggle()} disabled={playPending || (unavailable && !playing) || (sleep && !nightsKnown)} accessibilityRole="button"
            accessibilityLabel={playing ? t('listen.pause') : current && !state.error && !unavailable ? t('listen.resume') : t('listen.play')}
            accessibilityState={{ busy: playPending, disabled: unavailable && !playing }} style={[styles.play, unavailable && !playing && styles.disabled]}>
            <Svg width={26} height={28} viewBox="0 0 26 28">
              {playing
                ? <><Rect x={3} y={2} width={7} height={24} rx={2} fill={night.bg} /><Rect x={16} y={2} width={7} height={24} rx={2} fill={night.bg} /></>
                : <Path d="M6 3.2v21.6c0 1 1.1 1.6 1.9 1.1l16.6-10.8c.8-.5.8-1.7 0-2.2L7.9 2.1C7.1 1.6 6 2.2 6 3.2z" fill={night.bg} />}
            </Svg>
          </Pressable>
          {!protectedPauses && <Pressable disabled={!current || unavailable || playPending || !!state.error}
            accessibilityRole="button" accessibilityLabel={t('listen.forward15')} style={styles.skip}
            onPress={() => { void player.skip(15).catch(() => undefined); }}>
            <Text style={styles.skipText}>+15</Text>
          </Pressable>}
        </View>
        {!hush && <Pressable onPress={() => setTimerOpen(true)} accessibilityRole="button" style={styles.timer}>
          <Text style={styles.main}>{t('listen.timer')}</Text>
          <Text accessibilityLiveRegion="polite" style={styles.timerValue}>
            {state.fading ? t('listen.fading') : t('listen.timerSummary', { setting: minutes === null ? t('listen.timerOff') : t('listen.minutes', { minutes }) })}
          </Text>
        </Pressable>}
        </>}
        {sleep && nightsKnown && !user.paid && !nightLocked && <Text style={styles.allowance}>
          {usage.firstSleepUsed
            ? t(shelf === 'psalms' ? 'listen.psalmWeekly' : 'listen.nightWeekly')
            : t(shelf === 'psalms' ? 'listen.psalmAllowance' : 'listen.nightAllowance')}
        </Text>}
        {hush ? null : offlineAllowed ? (
          <Pressable accessibilityRole="button" accessibilityState={{ busy: downloading }} style={[styles.control, styles.centered]}
            disabled={downloading || !canStream || saved} onPress={() => void download()}>
            <Text style={styles.link}>{saved ? t('listen.downloaded') : downloading ? t('listen.downloading') : t('listen.download')}</Text>
          </Pressable>
        ) : !child && !nightLocked && <Text style={styles.note}>{t('listen.paidDownload')}</Text>}
        {downloadFailed && <Text accessibilityRole="alert" style={styles.note}>{t('listen.downloadFailed')}</Text>}
      </ScrollView>
      {dimmed && response === null && <Pressable accessibilityRole="button" accessibilityLabel={t('listen.brighten')} onPress={touch} style={styles.dim} />}
      {timerOpen && <Modal visible transparent animationType="slide" onRequestClose={() => setTimerOpen(false)}>
        <View style={styles.modal}>
          <SafeAreaView edges={['bottom']} style={styles.sheet} accessibilityViewIsModal>
            <Text accessibilityRole="header" style={styles.title}>{t('listen.timer')}</Text>
            <Text style={styles.secondary}>{t('listen.timerFade')}</Text>
            {SLEEP_MINUTES.map(value => (
              <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: value === minutes }}
                style={styles.control} onPress={() => chooseTimer(value)}>
                <Text style={styles.link}>{t('listen.minutes', { minutes: value })}</Text>
              </Pressable>
            ))}
            <Pressable accessibilityRole="button" accessibilityState={{ selected: minutes === null }}
              style={styles.control} onPress={() => chooseTimer(null)}>
              <Text style={styles.link}>{t('listen.timerOff')}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.control} onPress={() => setTimerOpen(false)}>
              <Text style={styles.link}>{t('listen.close')}</Text>
            </Pressable>
          </SafeAreaView>
        </View>
      </Modal>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: night.bg },
  content: { width: '100%', maxWidth: 520, alignSelf: 'center', flexGrow: 1, padding: 24, gap: 18 },
  control: { minHeight: 44, justifyContent: 'center' },
  centered: { alignSelf: 'center' },
  heading: { gap: 6, marginTop: 34, alignItems: 'center' },
  headingAlone: { marginVertical: 'auto' },
  title: { fontFamily: fonts.serif, color: night.ink, fontSize: 21, lineHeight: 27, textAlign: 'center' },
  tag: { fontFamily: fonts.mono, color: night.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.4, textAlign: 'center' },
  main: { color: night.ink, fontFamily: fonts.body, fontSize: 16 },
  secondary: { color: night.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  note: { color: night.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  link: { color: night.glow, fontFamily: fonts.strong, fontSize: 16 },
  verse: { gap: 12, marginTop: 22, marginBottom: 20 },
  verseText: { color: night.ink, fontFamily: fonts.serif, fontSize: 21, lineHeight: 31, textAlign: 'center' },
  reference: { color: dawn, fontFamily: fonts.mono, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.4, textAlign: 'center' },
  progress: { gap: 10, marginTop: 'auto' },
  rail: { height: 4, borderRadius: 2, backgroundColor: night.line, justifyContent: 'center' },
  fill: { height: 4, borderRadius: 2, backgroundColor: night.glow },
  thumb: { position: 'absolute', width: 14, height: 14, marginLeft: -7, borderRadius: 7, backgroundColor: night.glow },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: night.muted, fontFamily: fonts.mono, fontSize: 12 },
  transport: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 34 },
  skip: { width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, borderColor: night.line,
    alignItems: 'center', justifyContent: 'center' },
  skipText: { color: night.ink, fontFamily: fonts.mono, fontSize: 13 },
  disabled: { opacity: 0.55 },
  allowance: { color: night.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  cue: { minHeight: 30 },
  locked: { gap: 14, alignItems: 'center', paddingVertical: 8 },
  lockedLine: { color: night.ink, fontFamily: fonts.serif, fontSize: 21, lineHeight: 28, textAlign: 'center' },
  pill: { minHeight: 48, borderRadius: 24, paddingHorizontal: 24, justifyContent: 'center', backgroundColor: night.glow },
  pillText: { color: night.bg, fontFamily: fonts.strong, fontSize: 16 },
  responses: { gap: 8, marginBottom: 16 },
  response: { color: night.ink, fontFamily: fonts.serif, fontSize: 21, lineHeight: 30, textAlign: 'center' },
  play: { width: 84, height: 84, borderRadius: 42, backgroundColor: night.glow, alignItems: 'center', justifyContent: 'center' },
  timerValue: { color: night.glow, fontFamily: fonts.mono, fontSize: 13 },
  timer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 52, paddingHorizontal: 14,
    borderRadius: 16, borderWidth: 1, borderColor: night.line, backgroundColor: night.raised },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(14,26,34,0.88)' },
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(14,26,34,0.72)' },
  sheet: { backgroundColor: night.raised, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 4,
    width: '100%', maxWidth: 520, alignSelf: 'center' },
});
