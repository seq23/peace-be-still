// Screen 2: the journey picker for one door. The first allowed journey is preselected, so "Start …" is
// always on screen in the bottom bar; Mindset asks the one scripture question after its cards.
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { chooseJourney, journeysFor, type Door, type JourneyId } from '../../src/model';
import { useSettings, useT } from '../../src/settings';
import { JourneyArt } from '../../src/ui/art';
import { BackLink, Body, Card, Label, PillButton, Screen, SwitchRow, Title, styles, usePalette } from '../../src/ui';

export default function JourneysScreen() {
  const { settings, save } = useSettings();
  const t = useT();
  const c = usePalette();
  const router = useRouter();
  const params = useLocalSearchParams<{ door?: string; change?: string }>();
  const param = params.door;
  const changing = params.change === '1';
  const door: Door = param === 'faith' || param === 'mindset' ? param : settings.door ?? 'faith';
  const options = journeysFor(door, settings.age);
  const [tapped, setPicked] = useState<JourneyId>();
  const picked = [tapped, settings.journey].find(id => options.some(j => j.id === id)) ?? options[0]?.id;
  const [scripture, setScripture] = useState(!!settings.scripture);
  const chosen = options.find(j => j.id === picked);

  // Start only saves. On a first run the onboarding layout then moves her to Today (a replace, so back never
  // shows the door); from Settings she goes back to the tabs she came from.
  function start() {
    if (!chosen) return;
    save({ ...chooseJourney(settings, chosen.id), ...(door === 'mindset' ? { scripture: scripture || undefined } : {}) });
    if (changing) router.dismissTo('/today');
  }

  return (
    <Screen footer={chosen ? <PillButton onPress={start}>{t('journeys.start', { name: t(chosen.name) })}</PillButton> : undefined}>
      <BackLink onPress={() => (router.canGoBack() ? router.back() : router.replace('/door'))}>{t('common.back')}</BackLink>
      <View style={{ gap: 6 }}>
        <Label>{t(`doorName.${door}`)}</Label>
        <Title>{t('journeys.title')}</Title>
        <Body>{t('journeys.intro')}</Body>
      </View>
      <View role="radiogroup" style={{ gap: 12 }}>
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
        <SwitchRow title={t('journeys.scripture.title')} detail={t('journeys.scripture.detail')} value={scripture} onChange={setScripture} />
      ) : null}
    </Screen>
  );
}
