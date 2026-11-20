// Today keeps the date, week dots and the three daily cards in the shell's order.
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { journeyById } from '../../src/model';
import { useSettings, useT } from '../../src/settings';
import { Body, Card, Label, Screen, TextLink, styles, usePalette } from '../../src/ui';
import { fonts } from '../../src/theme/tokens';
import { canUse } from '../../src/gates';
import { daily, pages, type DailyPage } from '../../src/screens/daily/Daily';
import { dateKey, declaration, relativeDate, streak, todayStory } from '../../src/screens/daily/content';
import type { Key } from '../../src/i18n';

export default function Today() {
  const { settings } = useSettings();
  const t = useT('journey');
  const c = usePalette();
  const router = useRouter();
  const now = new Date();
  const user = { age: settings.age, paid: false };
  const record = daily.useRecord();
  const count = streak(record.value.days, now);
  const story = todayStory(now, __DEV__);
  const open = (page: DailyPage) => router.push({ pathname: '/today/[page]', params: { page } });
  const faith = settings.door !== 'mindset';
  const date = new Intl.DateTimeFormat(t.locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(now);
  const week = Array.from({ length: 7 }, (_, i) => relativeDate(now, i - now.getDay()));
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
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
        <Label>{date}</Label>
        {canUse('streak', user) && <Body size={14}>{t('daily.streak', { count })}</Body>}
      </View>
      {canUse('streak', user) && <View accessible accessibilityLabel={t('daily.streak', { count })} style={{ flexDirection: 'row', gap: 8 }}>
        {week.map(day => {
          const isToday = dateKey(day) === dateKey(now);
          const done = record.value.days.includes(dateKey(day));
          return (
            <View key={day.toISOString()} style={{ width: 30, alignItems: 'center', gap: 3 }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: isToday ? 2 : 1.5, borderColor: isToday ? c.accent : c.line, borderStyle: isToday || done ? 'solid' : 'dashed', backgroundColor: done ? c.accent : undefined }} />
              <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: c.muted }}>{new Intl.DateTimeFormat(t.locale, { weekday: 'narrow' }).format(day)}</Text>
            </View>
          );
        })}
      </View>}
      {canUse(pages.declaration.feature, user) && item('today.declaration.label', t(declaration(settings.door, now)), <TextLink onPress={() => open('declaration')}>{t('daily.openDeclaration')}</TextLink>, record.value.declarations.includes(dateKey(now)))}
      {faith && canUse(pages.story.feature, user) && item('today.story.label', draftTitle ?? t('daily.noStory'), story && <><Label>{t('daily.draft')}</Label><TextLink onPress={() => open('story')}>{t('daily.openStory')}</TextLink></>)}
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
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18 }}>
        {faith && canUse(pages.plans.feature, user) && <TextLink onPress={() => open('plans')}>{t('daily.title.plans')}</TextLink>}
        {faith && canUse(pages.journal.feature, user) && <TextLink onPress={() => open('journal')}>{t('daily.title.journal')}</TextLink>}
      </View>
    </Screen>
  );
}
