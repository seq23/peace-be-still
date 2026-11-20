// Today keeps the date, week dots and the three daily cards in the shell's order.
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { dayKey, journeyById } from '../../src/model';
import { useSettings, useT } from '../../src/settings';
import { Body, Card, Label, Screen, TextLink, styles, usePalette } from '../../src/ui';
import { fonts } from '../../src/theme/tokens';
import { canUse } from '../../src/gates';
import { daily, pages, type DailyPage } from '../../src/screens/daily/Daily';
import { declaration, todayStory } from '../../src/screens/daily/content';
import { DeclarationVerse } from '../../src/screens/daily/DeclarationVerse';
import { WeekStrip } from '../../src/ui/week';
import type { Key } from '../../src/i18n';

export default function Today() {
  const { settings } = useSettings();
  const t = useT('journey');
  const c = usePalette();
  const router = useRouter();
  const now = new Date();
  const user = { age: settings.age, paid: false };
  const record = daily.useRecord();
  const story = todayStory(now);
  const word = declaration(settings.door, now);
  const open = (page: DailyPage) => router.push({ pathname: '/today/[page]', params: { page } });
  const faith = settings.door !== 'mindset';
  const draftTitle = story ? t(story[1]) : undefined;
  const nights = faith ? journeyById('psalm-nights')! : journeyById('imagination-nights')!;

  const item = (label: Key, text: string, extra?: React.ReactNode, done = false) => (
    <Card>
      <View style={[styles.row, { alignItems: 'flex-start' }]}>
        <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: done ? c.accent : c.line, backgroundColor: done ? c.accent : undefined, marginTop: 2 }} />
        <View style={[styles.grow, { gap: 6 }]}>
          <Label>{t(label)}</Label>
          <Text style={{ fontFamily: fonts.serif, fontSize: 19, lineHeight: 26, color: c.ink }}>{text}</Text>
          {extra}
        </View>
      </View>
    </Card>
  );

  return (
    <Screen edges={['top']}>
      {canUse('streak', user) && <WeekStrip />}
      {canUse(pages.declaration.feature, user) && item('today.declaration.label', t(word.line), <>
        {word.passage && <DeclarationVerse passage={word.passage} />}
        <TextLink onPress={() => open('declaration')}>{t('daily.openDeclaration')}</TextLink>
      </>, record.value.declarations.includes(dayKey(now)))}
      {faith && canUse(pages.story.feature, user) && item('today.story.label', draftTitle ?? t('daily.noStory'), story ? <>
        <Label>{t('daily.draft')}</Label>
        <TextLink onPress={() => open('story')}>{t('daily.openStory')}</TextLink>
      </> : <TextLink onPress={() => router.push('/bible')}>{t('daily.readBible')}</TextLink>)}
      {!faith && canUse(pages.journal.feature, user) && item('today.scene.label', t('today.scene.text'), <TextLink onPress={() => open('journal')}>{t('daily.title.journal')}</TextLink>)}
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
      {faith && (canUse(pages.plans.feature, user) || canUse(pages.journal.feature, user)) && <Card>
        <Label>{t('daily.more')}</Label>
        {canUse(pages.plans.feature, user) && <TextLink onPress={() => open('plans')}>{t('daily.title.plans')}</TextLink>}
        {canUse(pages.journal.feature, user) && <TextLink onPress={() => open('journal')}>{t('daily.title.journal')}</TextLink>}
      </Card>}
    </Screen>
  );
}
