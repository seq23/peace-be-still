import { useIsFocused } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bible, displayRuns, formatReference, parseReference, type Verse } from '../../bible';
import { canUse } from '../../gates';
import { hasCallAndResponse, trackTitle, type Track } from '../../player/library';
import { SLEEP_MINUTES, type SleepMinutes } from '../../player/player';
import { useDimmer, usePlayer } from '../../player/usePlayer';
import { useSettings, useT } from '../../settings';
import { dawn, fonts, night } from '../../theme/tokens';
import { shelfOf } from './catalog';
import { usePublishedAudio } from './availability';
import { downloadAvailable, useOffline } from './offline';

function clock(seconds: number) {
  return [Math.floor(seconds / 60), String(Math.floor(seconds % 60)).padStart(2, '0')].join(':');
}

export function NowPlaying({ track, close }: { track: Track; close: () => void }) {
  const t = useT('journey');
  const { settings } = useSettings();
  const user = useOffline(settings.age);
  const { player, state, stop } = usePlayer();
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
  const { dimmed, touch } = useDimmer(focused && playing && response === null);
  const offlineAllowed = canUse('offline', user);
  const saved = offlineAllowed && (downloaded || downloadAvailable(track, user));
  const published = usePublishedAudio();
  const canStream = !stop && published?.get(track.file) === track.sha256;
  const unavailable = !saved && !canStream;
  const shelf = shelfOf(track);
  const protectedPauses = hasCallAndResponse(track);
  const untimedResponses = protectedPauses && !track.responsePauses;
  const translation = track.lang === 'es' ? 'RV1909' : 'KJV';
  const excerptRef = shelf === 'psalms' ? track.ref : track.scriptureRef;
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
    : shelf === 'miRefugio' ? [t('journey.miRefugio.name'), t('journey.miRefugio.subtitle')].join(' · ') : t('listen.bibleByBook');
  const minutes = state.sleepEndsAt === null ? null : Math.max(1, Math.ceil((state.sleepEndsAt - now) / 60_000));
  const position = current ? Math.min(track.seconds, state.position) : 0;
  const progress = Math.floor(position / track.seconds * 100);

  async function toggle() {
    if (playRequest.current || (unavailable && !playing)) return;
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
      }
    } finally {
      playRequest.current = false;
      setPlayPending(false);
    }
  }

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
        <View style={styles.heading}>
          <Text style={styles.tag}>{label}</Text>
          <Text accessibilityRole="header" style={styles.title}>{trackTitle(track, t.locale)}</Text>
          <Text style={styles.secondary}>{t('listen.aiVoice')}</Text>
        </View>
        {verse && <View style={styles.verse}>
          <Text style={styles.response}>
            {displayRuns(verse.text).map((run, index) => run.italic
              ? <Text key={index} style={styles.italic}>{run.text}</Text>
              : run.text)}
          </Text>
          <Text style={styles.reference}>{shelf === 'psalms' ? `${trackTitle(track, t.locale)}:${verse.verse}` : formatReference(verse, t.locale)} · {translation}</Text>
        </View>}
        {untimedResponses && <View style={styles.responses}>
          <Text style={styles.secondary}>{t('listen.respondDuringPauses')}</Text>
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
          </View>
          <View style={styles.times}>
            <Text style={styles.time}>{clock(position)}</Text>
            <Text style={styles.time}>{clock(track.seconds)}</Text>
          </View>
        </View>
        {unavailable && <Text accessibilityRole="alert" style={styles.secondary}>{t('listen.audioNotReady')}</Text>}
        {!unavailable && current && state.error === 'play-failed' &&
          <Text accessibilityRole="alert" style={styles.secondary}>{t('listen.playFailed')}</Text>}
        <View style={styles.transport}>
          {!protectedPauses && <Pressable disabled={!current || unavailable || playPending || !!state.error}
            accessibilityRole="button" accessibilityLabel={t('listen.back15')} style={styles.skip}
            onPress={() => { void player.skip(-15).catch(() => undefined); }}>
            <Text style={styles.link}>−15</Text>
          </Pressable>}
          <Pressable onPress={() => void toggle()} disabled={playPending || (unavailable && !playing)} accessibilityRole="button"
            accessibilityState={{ busy: playPending, disabled: unavailable && !playing }} style={[styles.play, unavailable && !playing && styles.disabled]}>
            <Text style={styles.playText}>{playing ? t('listen.pause') : current && !state.error && !unavailable ? t('listen.resume') : t('listen.play')}</Text>
          </Pressable>
          {!protectedPauses && <Pressable disabled={!current || unavailable || playPending || !!state.error}
            accessibilityRole="button" accessibilityLabel={t('listen.forward15')} style={styles.skip}
            onPress={() => { void player.skip(15).catch(() => undefined); }}>
            <Text style={styles.link}>+15</Text>
          </Pressable>}
        </View>
        <Pressable onPress={() => setTimerOpen(true)} accessibilityRole="button" style={styles.timer}>
          <Text style={styles.main}>{t('listen.timer')}</Text>
          <Text accessibilityLiveRegion="polite" style={styles.link}>
            {state.fading ? t('listen.fading') : t('listen.timerSummary', { setting: minutes === null ? t('listen.timerOff') : t('listen.minutes', { minutes }) })}
          </Text>
        </Pressable>
        {(shelf === 'psalms' || shelf === 'imagination') && <Text style={styles.allowance}>
          {t(shelf === 'psalms' ? 'listen.psalmAllowance' : 'listen.nightAllowance')}
        </Text>}
        {offlineAllowed ? (
          <Pressable accessibilityRole="button" accessibilityState={{ busy: downloading }} style={styles.control}
            disabled={downloading || !canStream || saved} onPress={() => void download()}>
            <Text style={styles.link}>{saved ? t('listen.downloaded') : downloading ? t('listen.downloading') : t('listen.download')}</Text>
          </Pressable>
        ) : <Text style={styles.secondary}>{t('listen.paidDownload')}</Text>}
        {downloadFailed && <Text accessibilityRole="alert" style={styles.secondary}>{t('listen.downloadFailed')}</Text>}
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
  heading: { gap: 12, marginVertical: 28 },
  title: { fontFamily: fonts.serif, color: night.ink, fontSize: 30, lineHeight: 39 },
  tag: { fontFamily: fonts.mono, color: night.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.4 },
  main: { color: night.ink, fontFamily: fonts.body, fontSize: 16 },
  secondary: { color: night.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  link: { color: night.glow, fontFamily: fonts.strong, fontSize: 16 },
  verse: { gap: 12, marginBottom: 20 },
  reference: { color: dawn, fontFamily: fonts.mono, fontSize: 12 },
  progress: { gap: 8, marginTop: 'auto' },
  rail: { height: 4, borderRadius: 2, backgroundColor: night.line },
  fill: { height: 4, borderRadius: 2, backgroundColor: night.glow },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: night.muted, fontFamily: fonts.mono, fontSize: 12 },
  transport: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  skip: { minWidth: 44, minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: night.line,
    alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.55 },
  allowance: { color: night.muted, fontFamily: fonts.body, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  cue: { minHeight: 30 },
  responses: { gap: 8, marginBottom: 16 },
  response: { color: night.ink, fontFamily: fonts.serif, fontSize: 21, lineHeight: 30 },
  italic: { fontFamily: 'LibreCaslonText_400Regular_Italic' },
  play: { minHeight: 56, paddingHorizontal: 32, borderRadius: 28, backgroundColor: night.glow, alignSelf: 'center', justifyContent: 'center' },
  playText: { color: night.bg, fontFamily: fonts.strong, fontSize: 17 },
  timer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 52, paddingHorizontal: 14,
    borderRadius: 16, borderWidth: 1, borderColor: night.line, backgroundColor: night.raised },
  dim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(14,26,34,0.88)' },
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(14,26,34,0.72)' },
  sheet: { backgroundColor: night.raised, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 4,
    width: '100%', maxWidth: 520, alignSelf: 'center' },
});
