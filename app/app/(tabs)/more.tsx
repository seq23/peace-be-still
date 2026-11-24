import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { useT } from '../../src/settings';
import { Card, Chevron, Screen, Title, styles, usePalette } from '../../src/ui';
import { fonts } from '../../src/theme/tokens';
import type { Key } from '../../src/i18n';

export default function More() {
  const t = useT('journey');
  const c = usePalette();
  const router = useRouter();
  // Only rows that open something (her catch 24 Nov 2026: the live app showed Saved verses and Journal as "Soon").
  const row = (key: Key, onPress: () => void) => (
    <Card key={key} onPress={onPress} label={t(key)} style={{ paddingVertical: 14 }}>
      <View style={styles.row}>
        <Text style={{ flex: 1, fontFamily: fonts.body, fontSize: 17, color: c.ink }}>{t(key)}</Text>
        <Chevron />
      </View>
    </Card>
  );
  return (
    <Screen edges={['top']}>
      <View style={{ marginTop: 24, marginBottom: 6 }}><Title>{t('tabs.more')}</Title></View>
      {row('more.settings', () => router.push('/settings'))}
    </Screen>
  );
}
