import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { formatReference, parseReference } from '../../bible/core';
import { canUse, type Feature } from '../../gates';
import { useSettings, useT } from '../../settings';
import { fonts } from '../../theme/tokens';
import { Body, Card, Label, PillButton, Screen, TextLink, Title, usePalette } from '../../ui';
import { ShareCard } from '../../share/ShareCard';
import { dayKey } from '../../model';
import { DeclarationVerse } from './DeclarationVerse';
import { declaration, plans, storyPassage, todayStory } from './content';
import { localRecord } from './local';

export const daily = localRecord('pbs-daily', {
  declarations: [] as string[],
  journal: {} as Record<string, string>,
  plans: {} as Record<string, number[]>,
});
export const pages = {
  declaration: { feature: 'dailyDeclaration', title: 'daily.title.declaration' },
  story: { feature: 'todayStory', title: 'daily.title.story' },
  plans: { feature: 'basicPlans', title: 'daily.title.plans' },
  journal: { feature: 'journal', title: 'daily.title.journal' },
} as const satisfies Record<string, { feature: Feature; title: Parameters<ReturnType<typeof useT>>[0] }>;
export type DailyPage = keyof typeof pages;

export function Daily({ page, back, read, now = new Date() }: {
  page: DailyPage;
  back: () => void;
  read: (book: string, chapter: number, verse?: number) => void;
  now?: Date;
}) {
  const t = useT('journey');
  const c = usePalette();
  const { settings } = useSettings();
  const user = { paid: false, age: settings.age };
  const state = daily.useRecord();
  const today = dayKey(now);
  const story = todayStory(now);
  const word = declaration(settings.door, now);
  const line = t(word.line);
  const [note, edit] = useState<string>();
  const [share, setShare] = useState(false);
  const [selectedPlan, setPlan] = useState<string>();
  const plan = plans.find(item => item.id === selectedPlan);
  const update = (change: (value: typeof state.value) => typeof state.value) => void daily.update(change);
  const link = (passage: string, label?: string) => {
    const ref = parseReference(passage);
    return ref && <TextLink onPress={() => read(ref.book, ref.chapter, ref.verse)}>{label ?? formatReference(ref, t.locale)}</TextLink>;
  };
  if (!canUse(pages[page].feature, user) || (settings.door !== 'faith' && (page === 'story' || page === 'plans'))) return null;
  return <Screen>
    <TextLink onPress={back}>{t('common.back')}</TextLink>
    <Title>{t(page === 'story' && story ? story[1] : pages[page].title)}</Title>
    {state.failed && <Body>{t('reader.storageError')}</Body>}
    {state.failed && !state.ready && <TextLink onPress={() => void state.retry()}>{t('reader.retry')}</TextLink>}
    {page === 'declaration' && <Card>
      <Body muted={false} size={21} style={{ fontFamily: fonts.serif }}>{line}</Body>
      {word.passage && <>
        <DeclarationVerse passage={word.passage} />
        <Body>{t('daily.prayer')}</Body>
      </>}
      {state.value.declarations.includes(today) ? <Label>{t('daily.done')}</Label> : state.ready && <PillButton onPress={() => update(value => ({ ...value, declarations: [...new Set([...value.declarations, today])] }))}>{t('daily.said')}</PillButton>}
      {canUse('shareCards', user) && !share && <TextLink onPress={() => setShare(true)}>{t('share.title')}</TextLink>}
    </Card>}
    {page === 'declaration' && share && <ShareCard text={line} credit={t('daily.title.declaration')} close={() => setShare(false)} />}
    {page === 'story' && <Card>
      {story ? <>
        <Label>{t('daily.draft')}</Label>
        <Label>{t('daily.retelling')}</Label>
        <Body muted={false}>{t(story[2])}</Body>
        <Body size={14}>{t('daily.storyAudioUnavailable')}</Body>
      </> : <Body>{t('daily.noStory')}</Body>}
      {link(storyPassage(now), t('daily.readBible'))}
    </Card>}
    {page === 'journal' && state.ready && <>
      <TextInput
        accessibilityLabel={t('daily.note')}
        placeholder={t('daily.note')}
        placeholderTextColor={c.muted}
        multiline
        maxLength={10000}
        value={note ?? state.value.journal[today] ?? ''}
        onChangeText={edit}
        style={{ minHeight: 160, textAlignVertical: 'top', padding: 14, borderWidth: 1, borderColor: c.line, borderRadius: 14, backgroundColor: c.card, color: c.ink, fontFamily: fonts.body, fontSize: 16 }}
      />
      {note !== undefined && note !== (state.value.journal[today] ?? '') && <PillButton onPress={() => update(value => {
        const journal = { ...value.journal };
        if (note.trim()) journal[today] = note;
        else delete journal[today];
        return { ...value, journal };
      })}>{t('daily.saveNote')}</PillButton>}
      {state.value.journal[today] && note === state.value.journal[today] && <Label>{t('daily.savedNote')}</Label>}
      {Object.entries(state.value.journal).filter(([day]) => day !== today).sort(([a], [b]) => b.localeCompare(a)).map(([day, entry]) =>
        <Card key={day}><Label>{new Intl.DateTimeFormat(t.locale, { dateStyle: 'medium' }).format(new Date(`${day}T12:00:00`))}</Label><Body muted={false}>{entry}</Body></Card>
      )}
    </>}
    {page === 'plans' && (plan ? <>
      <TextLink onPress={() => setPlan(undefined)}>{t('daily.title.plans')}</TextLink>
      <Title>{t(plan.title)}</Title>
      {plan.readings.map((reading, index) => {
        const complete = state.value.plans[plan.id]?.includes(index) ?? false;
        return <Card key={reading}>
          <Label>{t('daily.plan.day', { day: index + 1 })}</Label>
          {link(reading)}
          {complete ? <Label>{t('daily.done')}</Label> : state.ready && <TextLink onPress={() => update(value => {
            const days = value.plans[plan.id] ?? [];
            if (days.includes(index)) return value;
            return { ...value, plans: { ...value.plans, [plan.id]: [...days, index] } };
          })}>{t('daily.plan.complete')}</TextLink>}
        </Card>;
      })}
    </> : plans.map(item => <Card key={item.id} onPress={() => setPlan(item.id)}>
      <View><Body muted={false}>{t(item.title)}</Body><Body size={14}>{t('daily.plan.count', { count: state.value.plans[item.id]?.length ?? 0 })}</Body></View>
    </Card>))}
  </Screen>;
}
