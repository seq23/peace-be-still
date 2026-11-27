import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { onboarded, startRoute } from '../../src/model';
import { useCanUse } from '../../src/purchases/provider';
import { useSettings, useT } from '../../src/settings';
import { savedNights } from '../../src/ownNight/adapters';
import { isOwnNightPreview, previewWrite, reportMoment, writeScene } from '../../src/ownNight/api';
import { showsOwnNight } from '../../src/ownNight/Entry';
import { OwnNightScreen, type OwnNightConsent } from '../../src/ownNight/Screen';

/** Her one-time yes to the services that read a wish (Apple 5.1.2(i)); kept on this phone. */
export const OWN_NIGHT_CONSENT_KEY = 'peace-be-still-own-night-consent';
const consent: OwnNightConsent = {
  given: () => AsyncStorage.getItem(OWN_NIGHT_CONSENT_KEY).then(v => v === 'yes'),
  give: () => AsyncStorage.setItem(OWN_NIGHT_CONSENT_KEY, 'yes'),
};

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
    write={input => write(settings.age, input)}
    consent={consent}
    report={reason => previewState !== undefined ? Promise.resolve(true) : reportMoment(settings.age, reason)} startEditing={!!previewState && previewState !== 'locked'}
    close={() => router.canGoBack() ? router.back() : router.replace('/nights')}
    plans={() => router.push('/paid')}
    play={id => router.push({ pathname: '/own-night/play', params: { id } })} />;
}
