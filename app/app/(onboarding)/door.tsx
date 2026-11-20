// Screen 1: the front door. One question, two doors, one tap moves on.
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { partOfDay, type Door } from '../../src/model';
import { useSettings, useT } from '../../src/settings';
import { DoorArt } from '../../src/ui/art';
import { BackLink, Body, Card, Chevron, Logo, Screen, Title, styles, usePalette } from '../../src/ui';
import { fonts } from '../../src/theme/tokens';

export default function DoorScreen() {
  const { settings, save } = useSettings();
  const t = useT();
  const c = usePalette();
  const router = useRouter();
  const changing = !!settings.journey;

  function choose(door: Door) {
    // From Settings the door is only kept once a journey behind it is started; a first run saves it now.
    if (changing) { router.push({ pathname: '/journeys', params: { door } }); return; }
    save({ ...settings, door });
    router.push(settings.age ? '/journeys' : '/age');
  }

  const door = (id: Door) => (
    <Card key={id} onPress={() => choose(id)} label={t(`door.${id}.title`)} style={{ minHeight: 112, justifyContent: 'center' }}>
      <View style={styles.row}>
        <DoorArt door={id} />
        <View style={styles.grow}>
          <Text style={[styles.t2, { color: c.ink }]}>{t(`door.${id}.title`)}</Text>
          <Body size={14}>{t(`door.${id}.detail`)}</Body>
        </View>
        <Chevron />
      </View>
    </Card>
  );

  return (
    <Screen>
      {changing ? <BackLink onPress={() => router.back()}>{t('common.back')}</BackLink> : null}
      <Logo label={t('brand.name')} door={settings.door} />
      <View style={{ gap: 10, marginTop: 20 }}>
        <Body>{t(`greeting.${partOfDay(new Date().getHours())}`)}</Body>
        <Title>{t('door.title')}</Title>
        <Body>{t('door.intro')}</Body>
      </View>
      <View style={{ gap: 14, marginTop: 8 }}>{door('faith')}{door('mindset')}</View>
      <Body size={14} style={{ textAlign: 'center' }}>{t('door.later')}</Body>
      <Text style={{ fontFamily: fonts.serif, fontStyle: 'italic', fontSize: 14, color: c.muted, textAlign: 'center', marginTop: 24 }}>{t('door.tagline')}</Text>
    </Screen>
  );
}
