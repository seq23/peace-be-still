// Screen 6: Today. The date and the week dots with the day count at the top, then the day's three items
// in the mock-up's order. Items still being built say so with a small tag, never a fake verse or count.
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { journeyById } from '../../src/model';
import { useSettings, useT } from '../../src/settings';
import { Body, Card, Label, Screen, Tag, TextLink, styles, usePalette } from '../../src/ui';
import { fonts } from '../../src/theme/tokens';
import type { Key } from '../../src/i18n';

export default function Today() {
  const { settings } = useSettings();
  const t = useT('journey');
  const c = usePalette();
  const router = useRouter();
  const now = new Date();
  const faith = settings.door !== 'mindset';
  const date = new Intl.DateTimeFormat(t.locale, { weekday: 'short', day: 'numeric', month: 'short' }).format(now);
  const week = Array.from({ length: 7 }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + i));
  const nights = faith ? journeyById('psalm-nights')! : journeyById('imagination-nights')!;

  const item = (label: Key, text: string, extra?: React.ReactNode) => (
    <Card>
      <View style={[styles.row, { alignItems: 'flex-start' }]}>
        <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: c.line, marginTop: 2 }} />
        <View style={[styles.grow, { gap: 6 }]}>
          <Label>{t(label)}</Label>
          <Text style={{ fontFamily: fonts.serif, fontSize: 19, lineHeight: 26, color: c.ink }}>{text}</Text>
          {extra ?? <Tag>{t('common.soon')}</Tag>}
        </View>
      </View>
    </Card>
  );

  return (
    <Screen edges={['top']}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 8 }}>
        <Label>{date}</Label>
        <Body size={14}>{t('today.week', { count: 1 })}</Body>
      </View>
      <View accessible accessibilityLabel={date} style={{ flexDirection: 'row', gap: 8 }}>
        {week.map(day => {
          const isToday = day.getDate() === now.getDate();
          return (
            <View key={day.toISOString()} style={{ width: 30, alignItems: 'center', gap: 3 }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, borderWidth: isToday ? 2 : 1.5, borderColor: isToday ? c.accent : c.line, borderStyle: isToday ? 'solid' : 'dashed' }} />
              <Text style={{ fontFamily: fonts.mono, fontSize: 11, color: c.muted }}>{new Intl.DateTimeFormat(t.locale, { weekday: 'narrow' }).format(day)}</Text>
            </View>
          );
        })}
      </View>
      {item('today.declaration.label', t(faith ? 'today.declaration.faith' : 'today.declaration.mindset'))}
      {faith ? item('today.story.label', t('today.story.text')) : item('today.scene.label', t('today.scene.text'))}
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
    </Screen>
  );
}
