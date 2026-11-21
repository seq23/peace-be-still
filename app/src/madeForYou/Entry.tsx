import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { useSettings, useT } from '../settings';
import { Body, Card, Chevron, styles } from '../ui';
import { madeForYouCopy } from './copy';

export function MadeForYouEntry() {
  const { settings } = useSettings();
  const { locale } = useT('journey');
  const router = useRouter();
  if (!settings.age || settings.age === 'child') return null;
  return <Card onPress={() => router.push('/made-for-you')}>
    <View style={styles.row}>
      <View style={styles.grow}><Body muted={false}>{madeForYouCopy(locale)('title')}</Body></View>
      <Chevron />
    </View>
  </Card>;
}
