// Screen 6: Today. The date, the day count and the week dots at the top (WeekStrip), then the day's three items
// in the mock-up's order. Items still being built say so with a small tag, never a fake verse or count.
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { journeyById } from '../../src/model';
import { useSettings, useT } from '../../src/settings';
import { Body, Card, Label, Screen, Tag, TextLink, styles, usePalette } from '../../src/ui';
import { WeekStrip } from '../../src/ui/week';
import { fonts } from '../../src/theme/tokens';
import type { Key } from '../../src/i18n';

export default function Today() {
  const { settings } = useSettings();
  const t = useT('journey');
  const c = usePalette();
  const router = useRouter();
  const faith = settings.door !== 'mindset';
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
      <WeekStrip />
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
