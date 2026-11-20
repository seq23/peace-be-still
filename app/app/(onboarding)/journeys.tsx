// Screen 2: the journey picker for one door. The first allowed journey is preselected, so "Start …" is
// always on screen in the bottom bar; Mindset asks the one scripture question after its cards.
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { chooseJourney, journeysFor, onboarded, type Door, type JourneyId } from '../../src/model';
import { useSettings, useT } from '../../src/settings';
import { JourneyArt } from '../../src/ui/art';
import { BackLink, Body, Card, Label, PillButton, Screen, Title, styles, usePalette } from '../../src/ui';
import { fonts } from '../../src/theme/tokens';

export default function JourneysScreen() {
  const { settings, save } = useSettings();
  const t = useT();
  const c = usePalette();
  const router = useRouter();
  const param = useLocalSearchParams<{ door?: string }>().door;
  const door: Door = param === 'faith' || param === 'mindset' ? param : settings.door ?? 'faith';
  const options = journeysFor(door, settings.age);
  const [tapped, setPicked] = useState<JourneyId>();
  const picked = [tapped, settings.journey].find(id => options.some(j => j.id === id)) ?? options[0]?.id;
  const [started, setStarted] = useState(false);
  const [scripture, setScripture] = useState(!!settings.scripture);
  const chosen = options.find(j => j.id === picked);

  // Leave once the saved settings say onboarding is done (the tabs only exist from then on).
  useEffect(() => {
    if (!started || !onboarded(settings)) return;
    if (router.canDismiss()) router.dismissAll();
    router.replace('/today');
  }, [started, settings, router]);

  function start() {
    if (!chosen) return;
    save({ ...chooseJourney(settings, chosen.id), ...(door === 'mindset' ? { scripture: scripture || undefined } : {}) });
    setStarted(true);
  }

  return (
    <Screen footer={chosen ? <PillButton onPress={start}>{t('journeys.start', { name: t(chosen.name) })}</PillButton> : undefined}>
      <BackLink onPress={() => (router.canGoBack() ? router.back() : router.replace('/door'))}>{t('common.back')}</BackLink>
      <View style={{ gap: 6 }}>
        <Label>{t(`doorName.${door}`)}</Label>
        <Title>{t('journeys.title')}</Title>
        <Body>{t('journeys.intro')}</Body>
      </View>
      <View accessibilityRole="radiogroup" style={{ gap: 12 }}>
        {options.map(journey => (
          <Card key={journey.id} role="radio" selected={journey.id === picked} onPress={() => setPicked(journey.id)} style={{ padding: 14 }}>
            <View style={styles.row}>
              <JourneyArt id={journey.id} door={door} />
              <View style={styles.grow}>
                <Text style={[styles.t3, { color: c.ink }]}>{journey.subtitle ? `${t(journey.name)} · ${t(journey.subtitle)}` : t(journey.name)}</Text>
                <Body size={14}>{t(journey.purpose)}</Body>
              </View>
            </View>
          </Card>
        ))}
      </View>
      {door === 'mindset' ? (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.grow}>
            <Text style={{ fontFamily: fonts.strong, fontSize: 16, color: c.ink }}>{t('journeys.scripture.title')}</Text>
            <Body size={14}>{t('journeys.scripture.detail')}</Body>
          </View>
          <Switch accessibilityRole="switch" accessibilityLabel={t('journeys.scripture.title')} value={scripture} onValueChange={setScripture}
            trackColor={{ true: c.accent, false: c.line }} thumbColor="#FFFFFF" style={{ minWidth: 51, minHeight: 44 }} />
        </Card>
      ) : null}
    </Screen>
  );
}
