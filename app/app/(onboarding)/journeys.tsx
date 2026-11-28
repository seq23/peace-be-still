// Screen 2: the journey picker for one door. Nothing is preselected (her call 21 Nov 2026): Start stays disabled
// until she taps one, then names it. From Settings her saved journey shows as picked.
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { chooseJourney, journeysFor, type Door, type JourneyId } from '../../src/model';
import { useSettings, useT } from '../../src/settings';
import { JourneyArt } from '../../src/ui/art';
import { BackLink, Body, Card, Label, PillButton, Screen, Title, hangulWords, styles, usePalette } from '../../src/ui';

export default function JourneysScreen() {
  const { settings, save } = useSettings();
  const t = useT();
  const c = usePalette();
  const router = useRouter();
  const params = useLocalSearchParams<{ door?: string; change?: string }>();
  const param = params.door;
  const changing = params.change === '1';
  const door: Door = param === 'faith' || param === 'mindset' ? param : settings.door ?? 'faith';
  const options = journeysFor(door, settings.age, settings.language);
  const [tapped, setPicked] = useState<JourneyId>();
  const picked = [tapped, settings.journey].find(id => options.some(j => j.id === id));
  const chosen = options.find(j => j.id === picked);

  // Start only saves. On a first run the onboarding layout then moves her to Today (a replace, so back never
  // shows the door); from Settings she goes back to the tabs she came from.
  function start() {
    if (!chosen) return;
    save(chooseJourney(settings, chosen.id));
    if (changing) router.dismissTo('/today');
  }

  return (
    <Screen footer={<PillButton onPress={start} disabled={!chosen}>{chosen ? t('journeys.start', { name: t(chosen.name) }) : t('journeys.choose')}</PillButton>}>
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
                <JourneyName>{journey.subtitle ? `${t(journey.name)} · ${t(journey.subtitle)}` : t(journey.name)}</JourneyName>
                <Body size={14}>{t(journey.purpose)}</Body>
              </View>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

function JourneyName({ children }: { children: string }) {
  const c = usePalette();
  const words = hangulWords(children);
  return <Text lineBreakStrategyIOS={words.lineBreakStrategyIOS} style={[styles.t3, { color: c.ink }, words.style]}>{children}</Text>;
}
