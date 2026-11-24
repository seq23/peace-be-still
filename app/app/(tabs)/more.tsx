// More: every row opens a real screen (her catch 24 Nov 2026: the live app showed two rows that opened nothing).
// Saved verses live in the Bible, so the row shows only where the Bible tab does (tabsFor: none on the Mindset
// door, where /bible/* redirects to Today). The journal is on both doors (today/[page] has it outside faithOnly).
import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { tabsFor } from '../../src/model';
import { useSettings, useT } from '../../src/settings';
import { LinkRow, Screen, Title } from '../../src/ui';

export default function More() {
  const t = useT('journey');
  const { settings } = useSettings();
  const router = useRouter();
  return (
    <Screen edges={['top']}>
      <View style={{ marginTop: 24, marginBottom: 6 }}><Title>{t('tabs.more')}</Title></View>
      <LinkRow label={t('more.settings')} onPress={() => router.push('/settings')} />
      {tabsFor(settings).includes('bible') && <LinkRow label={t('more.saved')} onPress={() => router.push('/bible/saved')} />}
      <LinkRow label={t('more.journal')} onPress={() => router.push('/today/journal')} />
    </Screen>
  );
}
