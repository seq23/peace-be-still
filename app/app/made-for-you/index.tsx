import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { onboarded, startRoute } from '../../src/model';
import { useSettings, useT } from '../../src/settings';
import { isMadeForYouPreview, useMadeForYouPaid } from '../../src/madeForYou/paidStub';
import { previewApi } from '../../src/madeForYou/preview';
import { MadeForYouScreen } from '../../src/madeForYou/Screen';

export default function MadeForYouRoute() {
  const { settings } = useSettings();
  const { locale } = useT('journey');
  const paid = useMadeForYouPaid(settings.age);
  const router = useRouter();
  const { state } = useLocalSearchParams<{ state?: string }>();
  const preview = isMadeForYouPreview();
  const previewState = preview ? state : undefined;
  const api = React.useMemo(() => preview ? previewApi(previewState) : undefined, [preview, previewState]);

  if (!onboarded(settings) || !settings.door || !settings.age) return <Redirect href={startRoute(settings)} />;
  if (settings.age === 'child') return <Redirect href="/nights" />;
  const { age, door } = settings;
  const kind = door === 'faith' ? 'psalm' : 'imagination';
  return <MadeForYouScreen key={`${age}:${door}:${locale}:${paid}:${previewState ?? ''}`} paid={paid && previewState !== 'locked'} api={api}
    context={{ age, door, kind, lang: locale }}
    close={() => router.canGoBack() ? router.back() : router.replace('/nights')}
    plans={() => router.push('/paid')}
    play={row => router.push({ pathname: '/listen/[track]', params: { track: `made-for-you-${row.id}` } })} />;
}
