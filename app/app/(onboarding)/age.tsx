// The birth-year step. First run: sets the band. From Settings (?correct=1): a re-entry that may go younger any
// time and older once, 7 days after the first entry; under-13s never move up.
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { ageBand, correctAge, needsBirthMonth, withAge } from '../../src/model';
import { useSettings, useT } from '../../src/settings';
import { BackLink, Body, Label, PillButton, Screen, Title, usePalette } from '../../src/ui';
import { fonts } from '../../src/theme/tokens';

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function AgeScreen() {
  const { settings, save } = useSettings();
  const t = useT();
  const c = usePalette();
  const router = useRouter();
  const correcting = useLocalSearchParams<{ correct?: string }>().correct === '1' && !!settings.age;
  const [year, setYear] = useState('');
  const [month, setMonth] = useState<number | 'skip' | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const boundary = needsBirthMonth(Number(year));
  const monthName = (m: number) => new Intl.DateTimeFormat(t.locale, { month: 'short' }).format(new Date(2000, m - 1, 15));

  function changeYear(value: string) {
    setYear(value.replace(/\D/g, ''));
    setMonth(null);
    setProblem(null);
  }

  function next() {
    // Skipping the month keeps the younger band (the birthday is treated as not yet passed).
    const age = ageBand(Number(year), undefined, boundary && typeof month === 'number' ? month : undefined);
    if (!age || year.length !== 4) { setProblem(t('age.invalid')); return; }
    if (!correcting) {
      save(withAge(settings, age));
      router.push('/journeys');
      return;
    }
    const result = correctAge(settings, age);
    if (!result.ok) {
      setProblem(result.reason === 'wait'
        ? t('age.blocked.wait', { date: new Intl.DateTimeFormat(t.locale, { day: 'numeric', month: 'long' }).format(new Date(result.until)) })
        : t(result.reason === 'child' ? 'age.blocked.child' : 'age.blocked.used'));
      return;
    }
    save(result.settings);
    if (result.settings.journey) router.back();
    else router.replace('/journeys');
  }

  const chip = (key: string, text: string, selected: boolean, onPress: () => void) => (
    <Pressable key={key} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress}
      style={{ minWidth: 72, minHeight: 44, paddingHorizontal: 12, borderRadius: 999, borderWidth: selected ? 2 : 1, borderColor: selected ? c.accent : c.line, backgroundColor: c.card, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: selected ? fonts.strong : fonts.body, fontSize: 15, color: c.ink }}>{text}</Text>
    </Pressable>
  );

  return (
    <Screen footer={<PillButton onPress={next}>{t('age.continue')}</PillButton>}>
      <BackLink onPress={() => (router.canGoBack() ? router.back() : router.replace('/door'))}>{t('common.back')}</BackLink>
      <View style={{ gap: 8 }}>
        <Label>{t('age.label')}</Label>
        <Title>{t('age.title')}</Title>
        <Body>{t('age.intro')}</Body>
      </View>
      <TextInput accessibilityLabel={t('age.year')} placeholder={t('age.year')} placeholderTextColor={c.muted}
        keyboardType="number-pad" inputMode="numeric" maxLength={4} value={year} onChangeText={changeYear} onSubmitEditing={next}
        style={{ fontFamily: fonts.body, fontSize: 20, color: c.ink, backgroundColor: c.card, borderColor: problem ? c.wine : c.line, borderWidth: 1, borderRadius: 14, padding: 16, outlineColor: c.accent }} />
      {boundary ? (
        <View style={{ gap: 10 }}>
          <Body muted={false}>{t('age.month')}</Body>
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {MONTHS.map(m => chip(String(m), monthName(m), month === m, () => setMonth(m)))}
            {chip('skip', t('age.monthSkip'), month === 'skip', () => setMonth('skip'))}
          </View>
        </View>
      ) : null}
      {problem ? <Text accessibilityRole="alert" style={{ fontFamily: fonts.body, fontSize: 15, color: c.wine }}>{problem}</Text> : null}
      {correcting && settings.age === 'teen' && !settings.ageRaised ? <Body size={14}>{t('age.raiseOnce')}</Body> : null}
    </Screen>
  );
}
