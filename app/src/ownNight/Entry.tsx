// The way in to "Write your own night": 18 and over only (a teen or child never sees it at all), on the Mindset door.
// A free adult sees it marked for a paid plan; the screen behind it explains and offers the existing price screen.
import { isCjk, type Language } from '../i18n';
import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useCanUse } from '../purchases/provider';
import { useSettings, useT } from '../settings';
import { Body, Card, Chevron, Label, styles } from '../ui';
import { ownNightSupported } from './adapters';

/** Who is shown the entry at all: adults on the Mindset door, on a binary that has the phone voice and microphone question. */
// Korean and Chinese phones never see it in 1.0.1: the moment is written and read in English or Spanish only
// (store/review notes say so). The route redirects on the same check.
export const showsOwnNight = (settings: { age: string | null; door: string | null; language?: string }) =>
  settings.age === 'adult' && settings.door === 'mindset' && ownNightSupported() && (settings.language === undefined || !isCjk(settings.language as Language));

export function OwnNightEntry() {
  const { settings } = useSettings();
  const t = useT('journey');
  const canUse = useCanUse();
  const router = useRouter();
  if (!showsOwnNight(settings)) return null;
  const open = canUse('ownNight');
  return <Card onPress={() => router.push('/own-night')} label={`${t('ownNight.title')}${open ? '' : `, ${t('ownNight.paidLabel')}`}`}>
    <View style={styles.row}>
      <View style={[styles.grow, { gap: 4 }]}>
        {!open && <Label>{t('ownNight.paidLabel')}</Label>}
        <Body muted={false}>{t('ownNight.title')}</Body>
        <Body size={14}>{t('ownNight.entry')}</Body>
      </View>
      <Chevron />
    </View>
  </Card>;
}
