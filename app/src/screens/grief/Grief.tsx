// "For when you've lost someone" (21 Nov 2026), a journey in the God's Word door. Free: every stored verse (KJV or
// RV1909, read by reference from the bundled Bible) with one short, gentle line. Its whispered nights are listed
// only once their audio is published, and follow the sleep-night rule (first night free, then one a week).
// It points to a pastor or a grief counselor; the crisis lines are the same as the disclaimer's.
import React from 'react';
import { Text, View } from 'react-native';
import { formatReference, parseReference } from '../../bible/core';
import { griefLines, type GriefLine } from '../../content';
import { onePerScript, trackTitle, type Track } from '../../player/library';
import { useSettings, useT } from '../../settings';
import { fonts } from '../../theme/tokens';
import { BackLink, Body, Card, Chevron, Label, Screen, Title, styles, usePalette } from '../../ui';
import { useStoredVerses, VerseText } from '../daily/DeclarationVerse';
import { usePublishedAudio } from '../listen/availability';
import { shelfOf, trackBelongsToDoor } from '../listen/catalog';
import { downloadAvailable, useOffline } from '../listen/offline';
import { isPreviewSample, listenTracks } from '../listen/preview';

export function Grief({ back, listen }: { back: () => void; listen: (track: Track) => void }) {
  const t = useT('journey');
  const { settings } = useSettings();
  const published = usePublishedAudio();
  const user = useOffline(settings.age);
  const playable = (track: Track) => isPreviewSample(track) || published?.get(track.file) === track.sha256 || downloadAvailable(track, user);
  const nights = onePerScript(listenTracks().filter(track => track.lang === t.locale && trackBelongsToDoor(track, settings.door) && shelfOf(track) === 'grief'), playable)
    .filter(playable);
  return (
    <Screen>
      <BackLink onPress={back}>{t('common.back')}</BackLink>
      <View style={{ gap: 6 }}>
        <Label>{t('doorName.faith')}</Label>
        <Title>{t('grief.name')}</Title>
        <Body>{t('grief.intro')}</Body>
      </View>
      {griefLines(t.locale).map(line => <Line key={line.id} line={line} />)}
      {nights.length > 0 && <View style={{ gap: 8 }}>
        <Label>{t('grief.nights')}</Label>
        {nights.map(track => <Card key={track.file} onPress={() => listen(track)} label={trackTitle(track, t.locale)}>
          <View style={styles.row}>
            <View style={styles.grow}><Body muted={false}>{trackTitle(track, t.locale)}</Body></View>
            <Chevron />
          </View>
        </Card>)}
      </View>}
      <Card style={{ gap: 8 }}>
        <Label>{t('grief.help.label')}</Label>
        <Body muted={false}>{t('grief.help.people')}</Body>
        <Body size={14}>{t('grief.help.crisis')}</Body>
      </Card>
    </Screen>
  );
}

function Line({ line }: { line: GriefLine }) {
  const t = useT('journey');
  const c = usePalette();
  const translation = t.locale === 'es' ? 'RV1909' : 'KJV';
  const verses = useStoredVerses(line.ref, translation);
  const ref = parseReference(line.ref);
  return (
    <Card style={{ gap: 10 }}>
      {verses === undefined ? <Body size={14}>{t('reader.loading')}</Body>
        : !verses ? <Body size={14}>{t('daily.verseUnavailable')}</Body>
        : <VerseText verses={verses} style={{ fontFamily: fonts.serif, fontSize: 18, lineHeight: 27, color: c.ink }} />}
      {ref && <Label>{`${formatReference(ref, t.locale)} · ${translation}`}</Label>}
      <Text style={{ fontFamily: fonts.body, fontSize: 16, lineHeight: 23, color: c.muted }}>{line.text}</Text>
    </Card>
  );
}
