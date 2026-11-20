import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { useSettings, useT } from '../../src/settings';
import { tracks } from '../../src/player/usePlayer';
import { trackTitle, type Track } from '../../src/player/library';
import { byChapter, groupBible, shelfOf, trackBelongsToDoor } from '../../src/screens/listen/catalog';
import { Body, Card, Chevron, Label, Screen, Title } from '../../src/ui';

export default function Nights() {
  const { settings } = useSettings();
  const t = useT('journey');
  const router = useRouter();
  const visible = tracks.filter(track => track.lang === t.locale && trackBelongsToDoor(track, settings.door));
  const psalms = visible.filter(track => shelfOf(track) === 'psalms').sort(byChapter);
  const bible = groupBible(visible.filter(track => shelfOf(track) === 'bible'), t.locale);
  const stories = visible.filter(track => shelfOf(track) === (t.locale === 'es' ? 'miRefugio' : 'hushHarbor'));
  const imagination = visible.filter(track => shelfOf(track) === 'imagination');

  function row(track: Track) {
    return (
      <Card key={track.file} onPress={() => router.push({ pathname: '/listen/[track]', params: { track: track.sha256 } })}>
        <Body muted={false} style={{ flex: 1 }}>{trackTitle(track, t.locale)}</Body><Chevron />
      </Card>
    );
  }

  return (
    <Screen edges={['top']}>
      <Title>{t('tabs.nights')}</Title>
      {settings.door === 'mindset' ?
        <Shelf title={t('journey.imaginationNights.name')}>{imagination.map(row)}</Shelf> : <>
          <Shelf title={t('journey.psalmNights.name')}>{psalms.map(row)}</Shelf>
          <Shelf title={t('listen.bibleByBook')}>{bible.map(book => (
            <Disclosure key={book.code} title={book.title}>{book.chapters.map(row)}</Disclosure>
          ))}</Shelf>
          <Shelf title={t.locale === 'es' ? t('journey.miRefugio.name') :
            [t('journey.hushHarbor.name'), t('journey.hushHarbor.subtitle')].join(' · ')}>{stories.map(row)}</Shelf>
        </>}
    </Screen>
  );
}

function Shelf({ title, children }: { title: string; children: React.ReactNode[] }) {
  const t = useT('journey');
  return (
    <View style={{ gap: 8, marginTop: 20 }}>
      {children.length ? <Disclosure title={title}>{children}</Disclosure> :
        <><Label>{title}</Label><Body>{t('listen.emptyShelf')}</Body></>}
    </View>
  );
}

function Disclosure({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Card onPress={() => setOpen(!open)}><Body muted={false} style={{ flex: 1 }}>{title}</Body><Chevron /></Card>
      {open && children}
    </View>
  );
}
