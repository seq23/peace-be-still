// The 새벽기도 journey's morning, on the declaration page: the day of the 40, the stored 개역한글 verse, the prayer
// written ahead (content/saebyeok/ko.json, never generated), "I prayed", the KakaoTalk card, the dawn reminder and
// the link to the 6-day 신년 특새 on the website. Free, like the daily declaration it replaces in this journey.
import React, { useState } from 'react';
import { Linking, View } from 'react-native';
import { formatReference, parseReference, TRANSLATION_NAME } from '../../bible';
import type { DawnWord } from '../../content';
import { useCanUse } from '../../purchases/provider';
import { ReminderSettings, reminderApi } from '../../reminders';
import { useT } from '../../settings';
import { ShareCard } from '../../share/ShareCard';
import { fonts } from '../../theme/tokens';
import { Body, Card, Label, PillButton, TextLink } from '../../ui';
import { DeclarationVerse, useStoredVerses } from './DeclarationVerse';

export type Dawn = { word: DawnWord; day: number; round: number; total: number };

/** The 6-day 신년 특별새벽기도 on the Korean site (PR #103). */
export const NEW_YEAR_DAWN_URL = 'https://peacebestillapp.com/ko/questions/new-year-dawn-prayer-6-days/';
/** The link printed on the KakaoTalk card: the Korean home page. */
export const DAWN_CARD_LINK = 'peacebestillapp.com/ko';

export function dawnLabel(t: ReturnType<typeof useT>, dawn: Dawn): string {
  return t(dawn.round > 1 ? 'dawn.dayAgain' : 'dawn.day', { day: dawn.day, total: dawn.total });
}

export function DawnMorning({ dawn, done, ready, prayed }: { dawn: Dawn; done: boolean; ready: boolean; prayed: () => void }) {
  const t = useT('journey');
  const canUse = useCanUse();
  const [share, setShare] = useState(false);
  // The card quotes the same stored verse the page shows; until it is read (or if it cannot be), there is no card.
  const verses = useStoredVerses(dawn.word.ref, 'KRV');
  const reference = parseReference(dawn.word.ref);
  return <>
    <Card>
      <Label>{dawnLabel(t, dawn)}</Label>
      <Body muted={false} size={21} style={{ fontFamily: fonts.serif }}>{dawn.word.title}</Body>
      <DeclarationVerse passage={dawn.word.ref} />
      <Body muted={false} style={{ fontFamily: fonts.serif }}>{dawn.word.prayer}</Body>
      {done ? <Label>{t('daily.done')}</Label> : ready && <PillButton onPress={prayed}>{t('dawn.prayed')}</PillButton>}
      {canUse('shareCards') && !share && verses && <TextLink onPress={() => setShare(true)}>{t('dawn.share')}</TextLink>}
    </Card>
    {share && verses && reference && <ShareCard square label={dawn.word.title} text={verses.map(verse => verse.text).join(' ')}
      credit={`${formatReference(reference, 'ko')} · ${TRANSLATION_NAME.KRV}`} footer={DAWN_CARD_LINK} close={() => setShare(false)} />}
    {reminderApi() && <View style={{ gap: 4 }}>
      <Label>{t('dawn.reminder')}</Label>
      <ReminderSettings />
    </View>}
    <TextLink onPress={() => void Linking.openURL(NEW_YEAR_DAWN_URL)}>{t('dawn.newYear')}</TextLink>
  </>;
}
