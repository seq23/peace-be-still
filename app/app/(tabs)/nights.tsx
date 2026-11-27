import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { MadeForYouEntry } from '../../src/madeForYou/Entry';
import { OwnNightEntry } from '../../src/ownNight/Entry';
import { useSettings, useT } from '../../src/settings';
import { isPreviewSample, listenTracks } from '../../src/screens/listen/preview';
import { onePerScript, trackTitle, type Track } from '../../src/player/library';
import { byChapter, groupBible, shelfOf, trackBelongsToDoor } from '../../src/screens/listen/catalog';
import { usePublishedAudio } from '../../src/screens/listen/availability';
import { downloadAvailable, useOffline } from '../../src/screens/listen/offline';
import { Body, Card, Chevron, Label, Screen, styles, Title } from '../../src/ui';
import { BackToSleep, useSmallHours } from '../../src/screens/listen/HushScreen';
import { backToSleepTrack } from '../../src/screens/listen/hush';
import { clock } from '../../src/clock';

export default function Nights() {
  const { settings } = useSettings();
  const t = useT('journey');
  const router = useRouter();
  const published = usePublishedAudio();
  const user = useOffline(settings.age);
  const playable = (track: Track) => isPreviewSample(track) || published?.get(track.file) === track.sha256 || downloadAvailable(track, user);
  // One row per script: a re-voiced night or story shows its newest playable file, falling back to the older one.
  const visible = onePerScript(listenTracks().filter(track => track.lang === t.locale && trackBelongsToDoor(track, settings.door)), playable);
  const psalms = visible.filter(track => shelfOf(track) === 'psalms').sort(byChapter);
  const bible = groupBible(visible.filter(track => shelfOf(track) === 'bible'), t.locale);
  const stories = visible.filter(track => shelfOf(track) === (t.locale === 'es' ? 'miRefugio' : 'hushHarbor'));
  // The plain tellings are English only (Spanish phones get Mi Refugio), and listed only once their audio is
  // published: a voiced-but-unpublished story is not shown, and the shelf itself waits for its first story.
  const plainStories = t.locale === 'en' ? visible.filter(track => shelfOf(track) === 'bibleStories' && playable(track)) : [];
  const imagination = visible.filter(track => shelfOf(track) === 'imagination');
  // "For when you've lost someone": its nights are listed only once published, like the plain stories.
  const grief = visible.filter(track => shelfOf(track) === 'grief' && playable(track));
  // In the small hours the tab is only the one back-to-sleep button (until she asks for everything).
  const smallHours = useSmallHours();
  const [showAll, setShowAll] = useState(false);
  const hush = smallHours ? backToSleepTrack(listenTracks(), t.locale, settings.door, clock.now(), playable) : null;

  function row(track: Track) {
    const canPlay = playable(track);
    const open = canPlay ? () => router.push({ pathname: '/listen/[track]', params: { track: track.sha256 } }) : undefined;
    return (
      <Card key={track.file} onPress={open}>
        <View style={styles.row}>
          <View style={styles.grow}>
            <Body muted={false}>{trackTitle(track, t.locale)}</Body>
            {!canPlay && <Body size={14}>{t('listen.notReady')}</Body>}
          </View>
          {canPlay && <Chevron />}
        </View>
      </Card>
    );
  }

  if (hush && !showAll) return <BackToSleep track={hush} showAll={() => setShowAll(true)} />;

  return (
    <Screen edges={['top']}>
      <Title>{t('tabs.nights')}</Title>
      <MadeForYouEntry />
      <OwnNightEntry />
      {settings.door === 'mindset' ?
        <Shelf title={t('journey.imaginationNights.name')} detail={t('listen.nights', { count: imagination.length })}>{imagination.map(row)}</Shelf> : <>
          <Shelf title={t('journey.psalmNights.name')} detail={t('listen.whisperedNights', { count: psalms.length })}>{psalms.map(row)}</Shelf>
          {grief.length > 0 &&
            <Shelf title={t('grief.name')} detail={t('listen.nights', { count: grief.length })}>{grief.map(row)}</Shelf>}
          <Shelf title={t('listen.bibleByBook')} detail={t('listen.books', { count: bible.length })}>{bible.map(book => (
            <Disclosure key={book.code} title={book.title} detail={t('listen.chapters', { count: book.chapters.length })}>{book.chapters.map(row)}</Disclosure>
          ))}</Shelf>
          {plainStories.length > 0 &&
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
