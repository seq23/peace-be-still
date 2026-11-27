import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { onboarded, startRoute } from '../../src/model';
import { useCanUse } from '../../src/purchases/provider';
import { useSettings, useT } from '../../src/settings';
import { savedNights } from '../../src/ownNight/adapters';
import { isOwnNightPreview, previewWrite, writeScene } from '../../src/ownNight/api';
import { showsOwnNight } from '../../src/ownNight/Entry';
import { OwnNightScreen } from '../../src/ownNight/Screen';

export default function OwnNightRoute() {
  const { settings } = useSettings();
  const { locale } = useT('journey');
  const canUse = useCanUse();
  const router = useRouter();
  const { state } = useLocalSearchParams<{ state?: string }>();
  const preview = isOwnNightPreview();
  const previewState = preview ? state : undefined;
  if (!onboarded(settings)) return <Redirect href={startRoute(settings)} />;
  // 18 and over, Mindset door only: anyone else is sent back, whatever link they followed.
  if (!showsOwnNight(settings)) return <Redirect href="/nights" />;
  const lang = locale === 'es' ? 'es' : 'en';
  const write = previewState !== undefined ? previewWrite(previewState) : writeScene;
  return <OwnNightScreen key={`${settings.age}:${locale}:${previewState ?? ''}`} lang={lang}
    paid={canUse('ownNight') && previewState !== 'locked'} saved={savedNights}
    write={input => write(settings.age, input)} startEditing={!!previewState && previewState !== 'locked'}
    close={() => router.canGoBack() ? router.back() : router.replace('/nights')}
    plans={() => router.push('/paid')}
    play={id => router.push({ pathname: '/own-night/play', params: { id } })} />;
}
