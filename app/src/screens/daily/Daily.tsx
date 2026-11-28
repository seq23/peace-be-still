import { isCjk, type Language } from '../../i18n';
import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import { formatReference, parseReference } from '../../bible/core';
import { byTopic, dailyDeclaration, dawnFor, dawnWords, pastStories, shelf, storyFor, tellingFor, topics as faithTopics, type Story } from '../../content';
import type { Feature } from '../../gates';
import { usePurchases, useCanUse } from '../../purchases/provider';
import { useSettings, useT } from '../../settings';
import { fonts } from '../../theme/tokens';
import { Body, Card, Label, PillButton, Screen, TextLink, Title, usePalette } from '../../ui';
import { ShareCard } from '../../share/ShareCard';
import { dayKey, type Settings } from '../../model';
import type { Key } from '../../i18n';
import { DeclarationVerse } from './DeclarationVerse';
import { DawnMorning, type Dawn } from './Dawn';
import { StoryText } from './StoryText';
import { StoryArt } from '../../story/StoryArt';
import { artIds } from '../../story/art';
import { mindsetDeclarations, mindsetTopics, plans, topicNames, type TopicId } from './content';
import { localRecord } from './local';
import { markFirstValue } from '../../reminders';

export const daily = localRecord('pbs-daily', {
  declarations: [] as string[],
  journal: {} as Record<string, string>,
  plans: {} as Record<string, number[]>,
  /** The paid declaration topic she picked; unset means day by day. */
  topic: undefined as string | undefined,
});
export const pages = {
  declaration: { feature: 'dailyDeclaration', title: 'daily.title.declaration' },
  story: { feature: 'todayStory', title: 'daily.title.story' },
  stories: { feature: 'pastStories', title: 'story.past' },
  plans: { feature: 'basicPlans', title: 'daily.title.plans' },
  journal: { feature: 'journal', title: 'daily.title.journal' },
} as const satisfies Record<string, { feature: Feature; title: Key }>;
export type DailyPage = keyof typeof pages;
/** Pages only the God's Word door has: stories and reading plans are Bible content. */
export const faithOnly: readonly DailyPage[] = ['story', 'stories', 'plans'];

const isTopic = (id: string | undefined): id is TopicId => !!id && id in topicNames;
/** The topics one door offers: God's Word tags the Morning Word lines; Mindset has its own. */
export const topicsFor = (door: Settings['door']): TopicId[] => door === 'mindset' ? mindsetTopics : faithTopics.filter(isTopic);

/** The shelf this person reads (telling by language and journey, filtered for her age band) and today's story on it. */
export function useStories(now: Date) {
  const t = useT('journey');
  const { settings } = useSettings();
  const list = shelf(tellingFor(t.locale, settings.journey), settings.age);
  return { list, today: storyFor(list, now) };
}

/** Today's declaration for this door: a paid topic narrows it; the free lane gets the day's line. */
export function useDeclaration(now: Date) {
  const t = useT('journey');
  const { settings } = useSettings();
  const canUse = useCanUse();
  const state = daily.useRecord();
  const saved = state.value.topic;
  // A topic counts only behind the door it was picked in: switching doors falls back to day by day.
  const topic = canUse('declarationTopics') && isTopic(saved) && topicsFor(settings.door).includes(saved) ? saved : undefined;
  return declarationFor(settings, t.locale, now, topic);
}

/** The day's word: a key or written text, its verse reference, the paid topic, and inside 새벽기도 the morning of the 40. */
export type Word = { key?: Key; text?: string; passage?: string; topic?: TopicId; dawn?: Dawn };

export function declarationFor(settings: Pick<Settings, 'door' | 'journey' | 'dawnStart'>, locale: Language, now: Date, topic?: TopicId): Word {
  // 새벽기도 replaces the day's declaration with its own morning (no topics: the 40 run in order).
  const dawn = settings.journey === 'saebyeok' ? dawnFor(settings.dawnStart, now) : undefined;
  if (dawn) return { text: dawn.word.title, passage: dawn.word.ref, dawn: { ...dawn, total: dawnWords().length } };
  if (settings.door === 'mindset') {
    const chosen = topic ? mindsetDeclarations.filter(item => item.topic === topic) : [];
    const list = chosen.length ? chosen : mindsetDeclarations;
    const start = Date.UTC(now.getFullYear(), 0, 1);
    const index = Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - start) / 86_400_000);
    return { key: list[index % list.length].line, text: undefined, passage: undefined, topic };
  }
  const item = dailyDeclaration(locale, now, topic && (faithTopics as string[]).includes(topic) ? topic : undefined);
  // The 365 written declarations are English and Spanish; a Korean or Chinese screen shows the day's verse in
  // its own Bible with the fixed prayer key instead, never an English line.
  if (isCjk(locale)) return { key: 'daily.prayer' as const, text: undefined, passage: item.ref, topic };
  return { key: undefined, text: item.text, passage: item.ref, topic };
}

export function Daily({ page, back, read, upgrade, open, id, now = new Date() }: {
  page: DailyPage;
  back: () => void;
  read: (book: string, chapter: number, verse?: number) => void;
  upgrade: () => void;
  open: (page: DailyPage, id?: string) => void;
  /** A story id on the story page; a plan id on the plans page (a deep link opens that plan). */
  id?: string;
  now?: Date;
}) {
  const t = useT('journey');
  const c = usePalette();
  const { settings } = useSettings();
  const canUse = useCanUse();
  const { paid } = usePurchases();
  const state = daily.useRecord();
  const today = dayKey(now);
  const stories = useStories(now);
  const word = useDeclaration(now);
  const line = word.key ? t(word.key) : word.text!;
  const [note, edit] = useState<string>();
  const [share, setShare] = useState(false);
  const [selectedPlan, setPlan] = useState<string | undefined>(page === 'plans' ? id : undefined);
  const plan = plans.find(item => item.id === selectedPlan && (!item.paid || canUse('longPlans')));
  const update = (change: (value: typeof state.value) => typeof state.value) => void daily.update(change);
  /** The day's declaration said, or the dawn prayer prayed: today is done, and it counts as first value. */
  const said = () => { update(value => ({ ...value, declarations: [...new Set([...value.declarations, today])] })); void markFirstValue(); };
  const link = (passage: string, label?: string) => {
    const ref = parseReference(passage);
    return ref && <TextLink onPress={() => read(ref.book, ref.chapter, ref.verse)}>{label ?? formatReference(ref, t.locale)}</TextLink>;
  };
  const faith = settings.door === 'faith';
  if (!faith && faithOnly.includes(page)) return null;
  if (page !== 'stories' && !canUse(pages[page].feature)) return null;

  // A past story opens only in the paid lane; the free lane always reads today's.
  const storyId = page === 'story' ? id : undefined;
  const past = storyId && storyId !== stories.today?.id ? stories.list.find(item => item.id === storyId) : undefined;
  const story: Story | undefined = past && canUse('pastStories') ? past : stories.today;
  const topicList = topicsFor(settings.door);
  const topicLines = word.topic
    // The written declarations are English and Spanish: a Korean or Chinese screen lists each one's verse only.
    ? faith ? byTopic(t.locale, word.topic).map(item => ({ id: item.id, text: isCjk(t.locale) ? '' : item.text, passage: item.ref }))
      : mindsetDeclarations.filter(item => item.topic === word.topic).map(item => ({ id: item.line, text: t(item.line), passage: undefined }))
    : [];

  return <Screen>
    <TextLink onPress={back}>{t('common.back')}</TextLink>
    <Title>{page === 'story' && story ? story.title : page === 'plans' && plan ? t(plan.title) : page === 'declaration' && word.dawn ? t('dawn.title') : t(pages[page].title)}</Title>
    {(page === 'story' || page === 'stories') && isCjk(t.locale) && <Body>{t('content.storyInEnglish')}</Body>}
    {state.failed && <Body>{t('reader.storageError')}</Body>}
    {state.failed && !state.ready && <TextLink onPress={() => void state.retry()}>{t('reader.retry')}</TextLink>}
    {page === 'declaration' && word.dawn && <DawnMorning dawn={word.dawn} done={state.value.declarations.includes(today)} ready={state.ready} prayed={said} />}
    {page === 'declaration' && !word.dawn && <Card>
      <Body muted={false} size={21} style={{ fontFamily: fonts.serif }}>{line}</Body>
      {word.passage && <>
        <DeclarationVerse passage={word.passage} />
        {/* A Korean or Chinese card's line already is the prayer: it is said once, never twice. */}
        {word.key !== 'daily.prayer' && <Body>{t('daily.prayer')}</Body>}
      </>}
      {state.value.declarations.includes(today) ? <Label>{t('daily.done')}</Label> : state.ready && <PillButton onPress={said}>{t('daily.said')}</PillButton>}
      {canUse('shareCards') && !share && <TextLink onPress={() => setShare(true)}>{t('share.title')}</TextLink>}
    </Card>}
    {page === 'declaration' && share && <ShareCard text={line} credit={t('daily.title.declaration')} close={() => setShare(false)} />}
    {page === 'declaration' && !word.dawn && (canUse('declarationTopics') ? <View style={{ gap: 10 }}>
      <Label>{t('declaration.topics')}</Label>
      <Body size={14}>{t('declaration.topicsHint')}</Body>
      <View role="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {[undefined, ...topicList].map(id => <Card key={id ?? 'any'} role="radio" selected={word.topic === id}
          label={t(id ? topicNames[id] : 'declaration.anyTopic')}
          // The chosen chip's 2 px border takes its space from the padding, so the row never shifts.
          style={word.topic === id ? { paddingVertical: 7, paddingHorizontal: 11 } : { paddingVertical: 8, paddingHorizontal: 12 }}
          onPress={() => update(value => ({ ...value, topic: id }))}>
          <Body size={14} muted={false}>{t(id ? topicNames[id] : 'declaration.anyTopic')}</Body>
        </Card>)}
      </View>
      {word.topic && <>
        <Label>{t('declaration.inTopic', { topic: t(topicNames[word.topic]) })}</Label>
        {topicLines.map(item => <Card key={item.id} style={{ gap: 4 }}>
          {!!item.text && <Body muted={false} style={{ fontFamily: fonts.serif }}>{item.text}</Body>}
          {item.passage && link(item.passage)}
        </Card>)}
      </>}
    </View> : !paid && <TextLink onPress={upgrade}>{t('declaration.topicsPaid')}</TextLink>)}
    {page === 'story' && <>
      {story && <StoryArt ids={artIds(story)} title={story.title} />}
      {story ? <StoryText story={story} /> : <Body>{t('story.none')}</Body>}
      {story && link(story.refs[0], t('daily.readBible'))}
      {canUse('pastStories') ? <TextLink onPress={() => open('stories')}>{t('story.past')}</TextLink>
        : <TextLink onPress={upgrade}>{t('story.pastPaid')}</TextLink>}
    </>}
    {page === 'stories' && <Body>{t('story.pastIntro')}</Body>}
    {page === 'stories' && (canUse('pastStories') ? <>
      {stories.today && <Card onPress={() => open('story', stories.today!.id)} label={`${t('story.today')}, ${stories.today.title}`}>
        <Label>{t('story.today')}</Label>
        <Body muted={false}>{stories.today.title}</Body>
      </Card>}
      {pastStories(stories.list, now).map(({ story: item, date }) => <Card key={item.id} onPress={() => open('story', item.id)}
        label={`${new Intl.DateTimeFormat(t.locale, { dateStyle: 'medium' }).format(date)}, ${item.title}`}>
        <Label>{new Intl.DateTimeFormat(t.locale, { dateStyle: 'medium' }).format(date)}</Label>
        <Body muted={false}>{item.title}</Body>
      </Card>)}
      {!stories.list.length && <Body>{t('story.none')}</Body>}
    </> : <TextLink onPress={upgrade}>{t('story.pastPaid')}</TextLink>)}
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
      <TextLink onPress={() => setPlan(undefined)}>{`‹ ${t('daily.title.plans')}`}</TextLink>
      {plan.detail && <Body>{t(plan.detail)}</Body>}
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
    </> : <>
      <Label>{t('plan.basic')}</Label>
      {plans.filter(item => !item.paid).map(item => <PlanCard key={item.id} title={t(item.title)}
        progress={t('daily.plan.count', { count: state.value.plans[item.id]?.length ?? 0, total: item.readings.length })} onPress={() => setPlan(item.id)} />)}
      <Label>{t('plan.longer')}</Label>
      {plans.filter(item => item.paid).map(item => <PlanCard key={item.id} title={t(item.title)} detail={item.detail && t(item.detail)}
        progress={canUse('longPlans') ? t('daily.plan.count', { count: state.value.plans[item.id]?.length ?? 0, total: item.readings.length }) : t('plan.paidNote')}
        onPress={() => canUse('longPlans') ? setPlan(item.id) : upgrade()} />)}
    </>)}
  </Screen>;
}

function PlanCard({ title, detail, progress, onPress }: { title: string; detail?: string; progress: string; onPress: () => void }) {
  return <Card onPress={onPress} label={`${title}, ${progress}`}>
    <View style={{ gap: 2 }}>
      <Body muted={false}>{title}</Body>
      {detail && <Body size={14}>{detail}</Body>}
      <Body size={14}>{progress}</Body>
    </View>
  </Card>;
}
