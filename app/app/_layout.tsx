// Root: fonts, the person's saved choices, and the stack. The tabs layout and Settings send anyone who has not
// finished onboarding to the first unfinished step, so a deep link never skips the door or the birth year.
import { Figtree_400Regular, Figtree_600SemiBold } from '@expo-google-fonts/figtree';
import { LibreCaslonText_400Regular } from '@expo-google-fonts/libre-caslon-text';
import { SplineSansMono_500Medium } from '@expo-google-fonts/spline-sans-mono';
import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { PurchasesProvider } from '../src/purchases/provider';
import { SettingsProvider, useSettings, useT } from '../src/settings';
import { Body, Screen, usePalette } from '../src/ui';
import { ErrorScreen } from '../src/ui/ErrorScreen';
import { fonts } from '../src/theme/tokens';

/** Any screen that throws lands here (expo-router's route error boundary), never on a white screen. */
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return <ErrorScreen retry={() => void retry()} />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ LibreCaslonText_400Regular, Figtree_400Regular, Figtree_600SemiBold, SplineSansMono_500Medium });
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        {/* A font that fails or times out (a slow phone) falls back to the system face; it never holds the app on a spinner. */}
        <PurchasesProvider><Root fontsLoaded={fontsLoaded || !!fontError} /></PurchasesProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

export function Root({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { ready, readFailed, saveFailed } = useSettings();
  const t = useT();
  const c = usePalette();
  if (!ready || !fontsLoaded) return <View style={{ flex: 1, backgroundColor: c.bg, justifyContent: 'center' }}><ActivityIndicator color={c.accent} /></View>;
  // Nothing can be tapped: a failed read must never let anyone redo an age restriction.
  if (readFailed) return <Screen><Body muted={false} style={{ marginTop: 40 }}><Text accessibilityRole="alert">{t('error.read')}</Text></Body></Screen>;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {saveFailed ? (
        <SafeAreaView edges={['top']} style={{ backgroundColor: c.wine }}>
          <Text accessibilityRole="alert" style={{ color: c.on, padding: 12, textAlign: 'center', fontFamily: fonts.body }}>{t('error.save')}</Text>
        </SafeAreaView>
      ) : null}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />
    </View>
  );
}
