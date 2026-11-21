import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { listenTracks } from '../../src/screens/listen/preview';
import { onboarded, startRoute } from '../../src/model';
import { useSettings, useT } from '../../src/settings';
import { Body, BackLink, Screen } from '../../src/ui';
import { NowPlaying } from '../../src/screens/listen/NowPlaying';
import { trackBelongsToDoor } from '../../src/screens/listen/catalog';

export default function Listen() {
  const { settings } = useSettings();
  const { track: id, play } = useLocalSearchParams<{ track: string; play?: string }>();
  const router = useRouter();
  const t = useT('journey');
  if (!onboarded(settings)) return <Redirect href={startRoute(settings)} />;
  const track = listenTracks().find(item => item.sha256 === id && item.lang === t.locale && trackBelongsToDoor(item, settings.door));
  function close() {
    if (router.canGoBack()) router.back();
    else router.replace('/nights');
  }
  if (!track) return <Screen><BackLink onPress={close}>{t('common.back')}</BackLink><Body>{t('listen.emptyShelf')}</Body></Screen>;
  return <NowPlaying key={track.file} track={track} close={close} autoplay={play === '1'} />;
}
