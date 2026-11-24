// Settings, pushed from More. App-level, so it follows the app language even inside Mi Refugio.
import { Redirect, useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { onboarded, startRoute, voicesFor, type Language, type Voice } from '../src/model';
import { useSettings, useT } from '../src/settings';
import { BackLink, Card, Label, LinkRow, Screen, SwitchRow, Title, usePalette } from '../src/ui';
import { fonts } from '../src/theme/tokens';
import { MadeForYouSettings } from '../src/madeForYou/Settings';
import { ReminderSettings } from '../src/reminders';

export default function SettingsScreen() {
  const { settings, save } = useSettings();
  const t = useT();
  // The way back is named as the tab it returns to says it (Más inside Mi Refugio).
  const tabs = useT('journey');
  const c = usePalette();
  const router = useRouter();
  const voices = voicesFor(settings.age);
  if (!onboarded(settings)) return <Redirect href={startRoute(settings)} />;

  const radio = (key: string, text: string, selected: boolean, onPress: () => void) => (
    <Card key={key} role="radio" selected={selected} onPress={onPress} label={text} style={{ paddingVertical: 14 }}>
      <Text style={{ fontFamily: selected ? fonts.strong : fonts.body, fontSize: 17, color: c.ink }}>{text}</Text>
    </Card>
  );

  return (
    <Screen>
      <BackLink onPress={() => (router.canGoBack() ? router.back() : router.replace('/more'))}>{tabs('tabs.more')}</BackLink>
      <Title>{t('settings.title')}</Title>
      {settings.age !== 'child' && <LinkRow label={t('paid.title')} onPress={() => router.push('/paid')} />}
      {settings.age !== 'child' && <LinkRow label={t('memory.title')} onPress={() => router.push('/chat-memory')} />}
      <LinkRow label={t('settings.door')} value={settings.door ? t(`doorName.${settings.door}`) : null} onPress={() => router.push({ pathname: '/door', params: { change: '1' } })} />
      <LinkRow label={t('settings.birthYear')} onPress={() => router.push({ pathname: '/age', params: { correct: '1' } })} />
      {settings.door === 'mindset' ? (
        <SwitchRow title={t('journeys.scripture.title')} detail={t('journeys.scripture.detail')} value={!!settings.scripture}
          onChange={on => save({ ...settings, scripture: on || undefined })} />
      ) : null}
      {voices.length ? (
        <View role="radiogroup" style={{ gap: 10, marginTop: 10 }}>
          <Label>{t('settings.voice')}</Label>
          {voices.map((voice: Voice) => radio(voice, t(`voice.${voice}`), settings.voice === voice, () => save({ ...settings, voice })))}
        </View>
      ) : null}
      <ReminderSettings />
      <View role="radiogroup" style={{ gap: 10, marginTop: 10 }}>
        <Label>{t('settings.language')}</Label>
        {(['en', 'es'] as Language[]).map(language => radio(language, t(`language.${language}`), settings.language === language, () => save({ ...settings, language })))}
      </View>
      <MadeForYouSettings />
    </Screen>
  );
}
