import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { onboarded, startRoute } from '../../src/model';
import { useCanUse } from '../../src/purchases/provider';
import { useSettings, useT } from '../../src/settings';
import { BackLink, Body, Screen } from '../../src/ui';
import { savedNights } from '../../src/ownNight/adapters';
import { showsOwnNight } from '../../src/ownNight/Entry';
import { OwnNightPlay } from '../../src/ownNight/Play';
import type { SavedNight } from '../../src/ownNight/saved';

export default function OwnNightPlayRoute() {
  const { settings } = useSettings();
  const t = useT('journey');
  const canUse = useCanUse();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [night, setNight] = useState<SavedNight | null | undefined>(undefined);
  useEffect(() => { let live = true; void savedNights.list().then(list => { if (live) setNight(list.find(n => n.id === id) ?? null); }); return () => { live = false; }; }, [id]);
  const close = () => router.canGoBack() ? router.back() : router.replace('/own-night');
  if (!onboarded(settings)) return <Redirect href={startRoute(settings)} />;
  if (!showsOwnNight(settings)) return <Redirect href="/nights" />;
  if (!canUse('ownNight')) return <Redirect href="/own-night" />;
  if (night === undefined) return null;
  if (!night) return <Screen><BackLink onPress={close}>{t('common.back')}</BackLink><Body>{t('ownNight.notFound')}</Body></Screen>;
  return <OwnNightPlay key={night.id} night={night} close={close} />;
}
