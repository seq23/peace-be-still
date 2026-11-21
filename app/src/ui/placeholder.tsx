// A tab whose real screen comes in a later phase: its name, one true line about it, and a Soon tag.
import React from 'react';
import { View } from 'react-native';
import { useT } from '../settings';
import type { Key } from '../i18n';
import { Body, Screen, Tag, Title } from './index';

export function Placeholder({ heading, detail }: { heading: Key; detail: Key }) {
  const t = useT('journey');
  return (
    <Screen edges={['top']}>
      <View style={{ gap: 10, marginTop: 24 }}>
        <Title>{t(heading)}</Title>
        <Body>{t(detail)}</Body>
        <Tag>{t('common.soon')}</Tag>
      </View>
    </Screen>
  );
}
