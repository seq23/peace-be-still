// The app-wide error screen. expo-router shows it (the ErrorBoundary exported from app/_layout.tsx) when any
// screen throws, instead of a white screen or a crash: one calm line, one way forward. It reads nothing from the
// saved settings (they may be what failed); the language is whatever the app last used, else the phone's.
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { t } from '../i18n';
import { fonts } from '../theme/tokens';
import { usePalette } from './index';

export function ErrorScreen({ retry }: { retry: () => void }) {
  const c = usePalette();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center', padding: 24, gap: 16 }}>
      <Text accessibilityRole="header" style={{ fontFamily: fonts.serif, fontSize: 21, lineHeight: 28, color: c.ink }}>{t('error.crash.title')}</Text>
      <Text style={{ fontFamily: fonts.body, fontSize: 16, lineHeight: 24, color: c.muted }}>{t('error.crash.body')}</Text>
      <Pressable accessibilityRole="button" onPress={retry}
        style={{ alignSelf: 'flex-start', minHeight: 48, borderRadius: 24, paddingHorizontal: 24, justifyContent: 'center', backgroundColor: c.accent }}>
        <Text style={{ fontFamily: fonts.strong, fontSize: 16, color: c.on }}>{t('error.crash.retry')}</Text>
      </Pressable>
    </View>
  );
}
