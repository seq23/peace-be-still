// The small-hours screen for "3 AM, back to sleep" (the rule is in hush.ts): night, one large calm button, one quiet
// line, and a way back to the usual screen. Nothing else bright or busy.
import { contentLanguage } from '../../i18n';
import { noTracking } from '../../ui';
import { useIsFocused, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatReference, parseReference } from '../../bible/core';
import { clock, inSmallHours } from '../../clock';
import { trackTitle, type Track } from '../../player/library';
import { useT } from '../../settings';
import { fonts, night } from '../../theme/tokens';

/**
 * Whether it is the small hours now, read again whenever the tab comes into view or the app comes back to the
 * front (waking the phone at 3 AM), so the button comes and goes without a timer running all night.
 */
export function useSmallHours(): boolean {
  const focused = useIsFocused();
  const [small, setSmall] = useState(() => inSmallHours(clock.now()));
  useEffect(() => { if (focused) setSmall(inSmallHours(clock.now())); }, [focused]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => { if (next === 'active') setSmall(inSmallHours(clock.now())); });
    return () => subscription.remove();
  }, []);
  return small;
}

export function BackToSleep({ track, showAll }: { track: Track; showAll: () => void }) {
  const t = useT('journey');
  const router = useRouter();
  const minutes = Math.max(1, Math.round(track.seconds / 60));
  const ref = track.scriptureRef && parseReference(track.scriptureRef);
  const detail = t('hush.detail', { minutes, ref: ref ? formatReference(ref, t.locale) : trackTitle(track, contentLanguage(t.locale)) });
  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.middle}>
        <Text style={[styles.label, noTracking(t('hush.label'))]}>{t('hush.label')}</Text>
        <Pressable accessibilityRole="button" accessibilityHint={detail} style={styles.button}
          onPress={() => router.push({ pathname: '/listen/[track]', params: { track: track.sha256, play: '1' } })}>
          <Text style={styles.buttonText}>{t('hush.play')}</Text>
        </Pressable>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={showAll} style={styles.more}>
        <Text style={styles.moreText}>{t('hush.showAll')}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

// The dimmest surfaces the brand has: night ground, the raised night tone, no dawn colour, no filled colour.
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: night.bg, paddingHorizontal: 24 },
  middle: { flex: 1, justifyContent: 'center', gap: 18, width: '100%', maxWidth: 420, alignSelf: 'center' },
  label: { fontFamily: fonts.mono, color: night.muted, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', textAlign: 'center' },
  // The brand's one button on night (a pill, verb first with ›), drawn as an outline in night glow rather than a
  // filled glow pill: the largest thing on the screen, and still the dimmest.
  button: { minHeight: 88, borderRadius: 44, borderWidth: 1.5, borderColor: night.glow, backgroundColor: night.raised,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  buttonText: { fontFamily: fonts.strong, color: night.glow, fontSize: 20, lineHeight: 26, textAlign: 'center' },
  detail: { fontFamily: fonts.body, color: night.muted, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  more: { minHeight: 48, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 16, marginBottom: 12 },
  moreText: { fontFamily: fonts.body, color: night.muted, fontSize: 14 },
});
