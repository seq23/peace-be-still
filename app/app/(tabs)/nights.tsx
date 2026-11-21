import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { useSettings, useT } from '../../src/settings';
import { isPreviewSample, listenTracks } from '../../src/screens/listen/preview';
import { trackTitle, type Track } from '../../src/player/library';
import { byChapter, groupBible, shelfOf, trackBelongsToDoor } from '../../src/screens/listen/catalog';
import { usePublishedAudio } from '../../src/screens/listen/availability';
import { downloadAvailable, useOffline } from '../../src/screens/listen/offline';
import { Body, Card, Chevron, Label, Screen, styles, Title } from '../../src/ui';

export default function Nights() {
  const { settings } = useSettings();
  const t = useT('journey');
  const router = useRouter();
  const published = usePublishedAudio();
  const user = useOffline(settings.age);
  const visible = listenTracks().filter(track => track.lang === t.locale && trackBelongsToDoor(track, settings.door));
  const psalms = visible.filter(track => shelfOf(track) === 'psalms').sort(byChapter);
  const bible = groupBible(visible.filter(track => shelfOf(track) === 'bible'), t.locale);
  const stories = visible.filter(track => shelfOf(track) === (t.locale === 'es' ? 'miRefugio' : 'hushHarbor'));
  // The plain tellings are English only; Spanish phones get Mi Refugio.
  const plainStories = t.locale === 'en' ? visible.filter(track => shelfOf(track) === 'bibleStories') : [];
  const imagination = visible.filter(track => shelfOf(track) === 'imagination');

  function row(track: Track) {
    const playable = isPreviewSample(track) || published?.get(track.file) === track.sha256 || downloadAvailable(track, user);
    const open = playable ? () => router.push({ pathname: '/listen/[track]', params: { track: track.sha256 } }) : undefined;
    return (
      <Card key={track.file} onPress={open}>
        <View style={styles.row}>
          <View style={styles.grow}>
            <Body muted={false}>{trackTitle(track, t.locale)}</Body>
            {!playable && <Body size={14}>{t('listen.notReady')}</Body>}
          </View>
          {playable && <Chevron />}
        </View>
      </Card>
    );
  }

  return (
    <Screen edges={['top']}>
      <Title>{t('tabs.nights')}</Title>
      {settings.door === 'mindset' ?
        <Shelf title={t('journey.imaginationNights.name')} detail={t('listen.nights', { count: imagination.length })}>{imagination.map(row)}</Shelf> : <>
          <Shelf title={t('journey.psalmNights.name')} detail={t('listen.whisperedNights', { count: psalms.length })}>{psalms.map(row)}</Shelf>
          <Shelf title={t('listen.bibleByBook')} detail={t('listen.books', { count: bible.length })}>{bible.map(book => (
            <Disclosure key={book.code} title={book.title} detail={t('listen.chapters', { count: book.chapters.length })}>{book.chapters.map(row)}</Disclosure>
          ))}</Shelf>
          {t.locale === 'en' &&
            <Shelf title={t('listen.bibleStories')} detail={t('listen.stories', { count: plainStories.length })}>{plainStories.map(row)}</Shelf>}
          <Shelf title={t.locale === 'es' ? t('journey.miRefugio.name') :
            [t('journey.hushHarbor.name'), t('journey.hushHarbor.subtitle')].join(' · ')} detail={t('listen.stories', { count: stories.length })}>{stories.map(row)}</Shelf>
        </>}
    </Screen>
  );
}

function Shelf({ title, detail, children }: { title: string; detail: string; children: React.ReactNode[] }) {
  const t = useT('journey');
  return (
    <View style={{ gap: 8, marginTop: 20 }}>
      {children.length ? <Disclosure title={title} detail={detail}>{children}</Disclosure> :
        <><Label>{title}</Label><Body>{t('listen.emptyShelf')}</Body></>}
    </View>
  );
}

function Disclosure({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Card onPress={() => setOpen(!open)} expanded={open}>
        <View style={styles.row}>
          <View style={styles.grow}>
            <Body muted={false}>{title}</Body>
            <Body size={14}>{detail}</Body>
          </View>
          <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}><Chevron /></View>
        </View>
      </Card>
      {open && children}
    </View>
  );
}
