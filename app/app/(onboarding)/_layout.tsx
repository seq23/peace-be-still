// The one guard for the onboarding steps, like the tabs layout's: a step is shown only when it is the first
// unfinished one or an earlier one (going back). Once onboarding is done these steps open only from Settings
// (?change=1 for the door and picker, ?correct=1 for the birth year); otherwise she is on Today. So a deep link
// never skips the door or the birth year, Start only saves (this redirect moves her on), and back from Today
// never shows the front door.
import { Redirect, Stack, useGlobalSearchParams, useSegments } from 'expo-router';
import React from 'react';
import { onboardingRoute } from '../../src/model';
import { useSettings } from '../../src/settings';
import { usePalette } from '../../src/ui';

export default function OnboardingLayout() {
  const { settings } = useSettings();
  const c = usePalette();
  const step = useSegments().at(-1);
  const params = useGlobalSearchParams<{ change?: string; correct?: string }>();
  const fromSettings = params.change === '1' || params.correct === '1';
  const go = onboardingRoute(settings, step, fromSettings);
  if (go) return <Redirect href={go} />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }} />;
}
