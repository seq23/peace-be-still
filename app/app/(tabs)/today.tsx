// Today keeps the date, week dots and the three daily cards in the shell's order.
import { contentLanguage, isCjk } from '../../src/i18n';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { dayKey, journeyById } from '../../src/model';
import { useSettings, useT } from '../../src/settings';
import { Body, Card, Label, Screen, TextLink, hangulWords, styles, usePalette } from '../../src/ui';
import { fonts } from '../../src/theme/tokens';
import { useCanUse } from '../../src/purchases/provider';
import { daily, pages, useDeclaration, useStories, type DailyPage } from '../../src/screens/daily/Daily';
import { DeclarationVerse } from '../../src/screens/daily/DeclarationVerse';
import { dawnLabel } from '../../src/screens/daily/Dawn';
import { WeekStrip } from '../../src/ui/week';
import { ReminderOffer, useReminder } from '../../src/reminders';
import { clock } from '../../src/clock';
import { listenTracks, isPreviewSample } from '../../src/screens/listen/preview';
import { usePublishedAudio } from '../../src/screens/listen/availability';
import { BackToSleep, useSmallHours } from '../../src/screens/listen/HushScreen';
import { backToSleepTrack } from '../../src/screens/listen/hush';
import type { Track } from '../../src/player/library';
import { OwnNightEntry } from '../../src/ownNight/Entry';

export default function Today() {
  const { settings } = useSettings();
  const t = useT('journey');
  const c = usePalette();
  const router = useRouter();
  const now = new Date();
  const canUse = useCanUse();
  const record = daily.useRecord();
  const { today: story } = useStories(now);
  const word = useDeclaration(now);
  const open = (page: DailyPage) => router.push({ pathname: '/today/[page]', params: { page } });
  const faith = settings.door !== 'mindset';
  const nights = faith ? journeyById('psalm-nights')! : journeyById('imagination-nights')!;
  // In the small hours Today is only the one back-to-sleep button, once its audio is published (the manifest is read then only).
  // 새벽기도: the small hours end at her dawn time when she picked one before 5:00 (src/clock.ts inSmallHours).
  const reminder = useReminder();
  const smallHours = useSmallHours(settings.journey === 'saebyeok' ? reminder.time : undefined);
  const published = usePublishedAudio(smallHours && faith);
  const [showAll, setShowAll] = useState(false);
  const playable = (track: Track) => isPreviewSample(track) || published?.get(track.file) === track.sha256;
  const hush = smallHours ? backToSleepTrack(listenTracks(), contentLanguage(t.locale), settings.door, clock.now(), playable) : null;

  const item = (label: string, text: string, extra?: React.ReactNode, done = false) => (
    <Card>
      <View style={[styles.row, { alignItems: 'flex-start' }]}>
        <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: done ? c.accent : c.line, backgroundColor: done ? c.accent : undefined, marginTop: 2 }} />
        <View style={[styles.grow, { gap: 6 }]}>
          <Label>{label}</Label>
          <Text lineBreakStrategyIOS={hangulWords(text).lineBreakStrategyIOS} style={[{ fontFamily: fonts.serif, fontSize: 19, lineHeight: 26, color: c.ink }, hangulWords(text).style]}>{text}</Text>
          {extra}
        </View>
      </View>
    </Card>
  );

  if (hush && !showAll) return <BackToSleep track={hush} showAll={() => setShowAll(true)} />;

  return (
    <Screen edges={['top']}>
      {canUse('streak') && <WeekStrip />}
      <ReminderOffer />
      {canUse(pages.declaration.feature) && item(word.dawn ? dawnLabel(t, word.dawn) : t('today.declaration.label'), word.key ? t(word.key) : word.text!, <>
        {word.passage && <DeclarationVerse passage={word.passage} />}
        <TextLink onPress={() => open('declaration')}>{t(word.dawn ? 'dawn.open' : 'daily.openDeclaration')}</TextLink>
      </>, record.value.declarations.includes(dayKey(now)))}
      {faith && canUse(pages.story.feature) && story && item(t('today.story.label'), story.title, <>
        {isCjk(t.locale) && <Body size={14}>{t('content.storyInEnglish')}</Body>}
        <TextLink onPress={() => open('story')}>{t('daily.openStory')}</TextLink>
      </>)}
      {!faith && canUse(pages.journal.feature) && item(t('today.scene.label'), t('today.scene.text'), <TextLink onPress={() => open('journal')}>{t('daily.title.journal')}</TextLink>)}
      {settings.journey === 'living-in-the-end' && <OwnNightEntry />}
      <Card style={{ paddingVertical: 12 }}>
        <View style={styles.row}>
          <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: c.line }} />
          <View style={styles.grow}>
            <Text style={{ fontFamily: fonts.strong, fontSize: 16, color: c.ink }}>{t('today.tonight', { name: t(nights.name) })}</Text>
            <Body size={14}>{t(faith ? 'today.tonight.faith' : 'today.tonight.mindset')}</Body>
          </View>
          <TextLink onPress={() => router.navigate('/nights')}>{`${t('today.open')}  ›`}</TextLink>
        </View>
      </Card>
      {faith && (canUse(pages.plans.feature) || canUse(pages.journal.feature)) && <Card>
        <Label>{t('daily.more')}</Label>
        {canUse(pages.plans.feature) && <TextLink onPress={() => open('plans')}>{t('daily.title.plans')}</TextLink>}
        {canUse(pages.journal.feature) && <TextLink onPress={() => open('journal')}>{t('daily.title.journal')}</TextLink>}
        <TextLink onPress={() => router.push('/grief')}>{t('grief.name')}</TextLink>
      </Card>}
    </Screen>
  );
}
