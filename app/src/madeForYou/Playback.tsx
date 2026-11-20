import { useIsFocused } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t } from '../i18n';
import type { Language } from '../model';
import type { Track } from '../player/library';
import { SLEEP_MINUTES } from '../player/player';
import { useDimmer, usePlayer } from '../player/usePlayer';
import { fonts, night } from '../theme/tokens';
import type { Ready } from './api';
import { madeForYouCopy } from './copy';

export function MadeForYouPlayback({ row, lang, source, close }: {
  row: Ready; lang: Language; source: (id: string) => Promise<string>; close: () => void;
}) {
  const { player, state } = usePlayer();
  const focused = useIsFocused();
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const busy = useRef(false);
  const leaving = useRef(false);
  const current = state.track?.ref === row.id && state.track.kind === 'made-for-you';
  const playing = current && state.playing;
  const { dimmed, touch } = useDimmer(focused && playing);
  const copy = (key: Parameters<typeof t>[0]) => t(key, { locale: lang });
  const title = madeForYouCopy(lang)('title');

  async function toggle() {
    if (busy.current) return;
    busy.current = true;
    touch();
    setLoading(true);
    setFailed(false);
    try {
      if (playing) await player.pause();
      else if (current && !state.error) player.resume();
      else {
        const file = await source(row.id);
        if (leaving.current) return;
        const track: Track = {
          file, kind: 'made-for-you', lang, titles: { [lang]: title },
          ref: row.id, seconds: row.seconds, sha256: row.sha256, voice: 'AI',
        };
        await player.play(track, null);
        if (player.getState().error) setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  const progress = current ? Math.min(100, Math.round(state.position / row.seconds * 100)) : 0;
  const muted = { fontFamily: fonts.body, color: night.muted, fontSize: 16 } as const;
  const link = { fontFamily: fonts.strong, color: night.glow, fontSize: 16 } as const;
  return <SafeAreaView style={{ flex: 1, backgroundColor: night.bg }}>
    <ScrollView contentContainerStyle={{ width: '100%', maxWidth: 520, alignSelf: 'center', padding: 24, gap: 24, flexGrow: 1 }}>
      <Pressable accessibilityRole="button" onPress={() => { leaving.current = true; close(); }} style={{ minHeight: 44 }}>
        <Text style={link}>{copy('listen.close')}</Text>
      </Pressable>
      <Text accessibilityRole="header" style={{ fontFamily: fonts.serif, color: night.ink, fontSize: 30 }}>{title}</Text>
      <Text style={muted}>{copy('listen.aiVoice')}</Text>
      <View accessibilityRole="progressbar" accessibilityLabel={copy('listen.progress')}
        accessibilityValue={{ min: 0, max: 100, now: progress }}
        style={{ marginTop: 'auto', height: 4, borderRadius: 2, backgroundColor: night.line }}>
        <View style={{ width: `${progress}%`, height: 4, borderRadius: 2, backgroundColor: night.glow }} />
      </View>
      {failed && <Text accessibilityRole="alert" style={muted}>{copy('listen.playFailed')}</Text>}
      <Pressable accessibilityRole="button" accessibilityState={{ busy: loading }} disabled={loading}
        onPress={() => void toggle()}
        style={{ minHeight: 56, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 32, borderRadius: 28, backgroundColor: night.glow }}>
        <Text style={{ fontFamily: fonts.strong, color: night.bg, fontSize: 17 }}>{copy(playing ? 'listen.pause' : current && !state.error ? 'listen.resume' : 'listen.play')}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: timerOpen }}
        style={{ minHeight: 44 }} onPress={() => setTimerOpen(value => !value)}>
        <Text style={link}>{copy('listen.timer')}</Text>
      </Pressable>
      {timerOpen && [null, ...SLEEP_MINUTES].map(minutes => <Pressable key={String(minutes)} accessibilityRole="button"
        style={{ minHeight: 44 }} onPress={() => { player.setSleepTimer(minutes); setTimerOpen(false); }}>
        <Text style={link}>{minutes === null ? copy('listen.timerOff') : t('listen.minutes', { locale: lang, minutes })}</Text>
      </Pressable>)}
    </ScrollView>
    {dimmed && <Pressable accessibilityRole="button" accessibilityLabel={copy('listen.brighten')} onPress={touch}
      style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(14,26,34,0.88)' }} />}
  </SafeAreaView>;
}
