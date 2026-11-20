import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { onboarded, startRoute } from '../../src/model';
import { useSettings, useT } from '../../src/settings';
import { useMadeForYouPaid } from '../../src/madeForYou/paidStub';
import { MadeForYouScreen } from '../../src/madeForYou/Screen';

export default function MadeForYouRoute() {
  const { settings } = useSettings();
  const { locale } = useT('journey');
  const paid = useMadeForYouPaid(settings.age);
  const router = useRouter();

  if (!onboarded(settings) || !settings.door || !settings.age) return <Redirect href={startRoute(settings)} />;
  if (settings.age === 'child') return <Redirect href="/nights" />;
  const { age, door } = settings;
  const kind = door === 'faith' ? 'psalm' : 'imagination';
  return <MadeForYouScreen key={`${age}:${door}:${locale}:${paid}`} paid={paid}
    context={{ age, door, kind, lang: locale }}
    close={() => router.canGoBack() ? router.back() : router.replace('/nights')}
    plans={() => router.push('/paid')} />;
}
