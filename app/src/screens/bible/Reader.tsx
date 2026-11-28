import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View, type LayoutChangeEvent, type ScrollView } from 'react-native';
import { BOOKS, TRANSLATION_CREDIT, citation, displayRuns, formatReference, parseReference, startsParagraph, translationFor, type Bible, type Translation, type Verse } from '../../bible/core';
import { canUse } from '../../gates';
import { useSettings, useT } from '../../settings';
import { fonts } from '../../theme/tokens';
import { BackLink, Body, Card, Label, PillButton, Screen, TextLink, Title, usePalette } from '../../ui';
import { localRecord } from '../daily/local';
import { ShareCard } from '../../share/ShareCard';

export type BiblePage = 'chapter' | 'books' | 'search' | 'saved';
export type BibleLocation = { book: string; chapter: number; verse?: number };
const marks = localRecord<Record<string, { verse: Verse; translation: Translation; saved: boolean; highlight: boolean }>>('pbs-bible-marks', {});
const home = { book: 'JOH', chapter: 3 };
async function lastChapter(db: Bible, book: string): Promise<number> {
  // Chapters are contiguous, and Psalms has the most (150).
  let low = 1;
  let high = 150;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if ((await db.chapter(book, mid)).length) low = mid;
    else high = mid - 1;
  }
  return low;
}

const keyOf = (translation: Translation, verse: Verse) => `${translation}:${verse.book}:${verse.chapter}:${verse.verse}`;

export function Reader({ page, location = home, open, go, back }: {
  page: BiblePage;
  location?: BibleLocation;
  open: (translation: Translation) => Promise<Bible>;
  go: (page: BiblePage, location?: BibleLocation) => void;
  back?: () => void;
}) {
  const t = useT('journey');
  const c = usePalette();
  const { settings } = useSettings();
  const user = { age: settings.age, paid: false };
  const translation = translationFor(t.locale);
  const { book, chapter, verse: target } = location;
  const data = marks.useRecord();
  const [query, setQuery] = useState('');
  const [submitted, submit] = useState('');
  const [selected, select] = useState<number | undefined>();
  const [share, setShare] = useState<Verse>();
  const [attempt, retry] = useState(0);
  const request = `${translation}:${page}:${book}:${chapter}:${submitted}:${attempt}`;
  const [result, setResult] = useState<{ request: string; rows: Verse[]; next?: BibleLocation; previous?: BibleLocation; error?: true }>();
  const current = result?.request === request ? result : undefined;
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const scrolledChapter = useRef<typeof current>(undefined);

  function scrollToVerse({ nativeEvent: { layout } }: LayoutChangeEvent) {
    if (!current || scrolledChapter.current === current || !scroll.current) return;
    scrolledChapter.current = current;
    // Verse rows are direct children of the scroll content, so y includes the reader heading.
    scroll.current.scrollTo({ y: Math.max(0, layout.y - 12), animated: false });
  }

  useEffect(() => {
    select(undefined);
    setShare(undefined);
    if (page !== 'chapter' && (page !== 'search' || !submitted)) return;
    let active = true;
    void open(translation).then(async db => {
      if (page === 'chapter') {
        const [rows, following] = await Promise.all([db.chapter(book, chapter), db.chapter(book, chapter + 1)]);
        if (!rows.length) return { request, rows };
        const index = BOOKS.findIndex(item => item.code === book);
        const nextBook = BOOKS[index + 1]?.code;
        const previousBook = BOOKS[index - 1]?.code;
        const next = following.length ? { book, chapter: chapter + 1 } : nextBook ? { book: nextBook, chapter: 1 } : undefined;
        const previous = chapter > 1 ? { book, chapter: chapter - 1 } :
          previousBook ? { book: previousBook, chapter: await lastChapter(db, previousBook) } : undefined;
        return { request, rows, next, previous };
      }
      const ref = parseReference(submitted);
      return { request, rows: await (ref ? db.passage(ref) : db.search(submitted)) };
    }).then(value => { if (active) setResult(value); }, () => {
      if (active) setResult({ request, rows: [], error: true });
    });
    return () => { active = false; };
  }, [open, translation, page, book, chapter, submitted, request]);

  const update = (verse: Verse, field: 'saved' | 'highlight') => {
    void marks.update(previous => {
      const key = keyOf(translation, verse);
      const entry = previous[key] ?? { verse, translation, saved: false, highlight: false };
      const next = { ...previous, [key]: { ...entry, [field]: !entry[field] } };
      if (!next[key].saved && !next[key].highlight) delete next[key];
      return next;
    });
  };
  const inputStyle = { color: c.ink, backgroundColor: c.card, borderColor: c.line, borderWidth: 1, borderRadius: 12, padding: 12, fontFamily: fonts.body, fontSize: 16 };
  const savedAllowed = canUse('savedVerses', user);
  const saved = Object.values(data.value).filter(entry => entry.translation === translation);
  const rows = page === 'saved' ? saved.map(entry => entry.verse) : current?.rows;

  if (!canUse('bibleText', user) || (page === 'saved' && !savedAllowed)) return null;

  return (
    <Screen edges={back ? ['top', 'bottom'] : ['top']} scrollRef={scroll}>
      {back && <BackLink onPress={back}>{t('common.back')}</BackLink>}
      <Label>{translation === 'RV1909' ? t('reader.rv') : translation === 'KJV' ? t('reader.kjv') : TRANSLATION_CREDIT[translation]}</Label>
      <Title>{page === 'chapter' ? formatReference(location, t.locale) : t(`reader.${page}`)}</Title>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18 }}>
        {page !== 'chapter' && <TextLink onPress={() => go('chapter', location)}>{t('reader.read')}</TextLink>}
        {page !== 'books' && <TextLink onPress={() => go('books', location)}>{t('reader.books')}</TextLink>}
        {page !== 'search' && <TextLink onPress={() => go('search', location)}>{t('reader.search')}</TextLink>}
        {savedAllowed && page !== 'saved' && <TextLink onPress={() => go('saved', location)}>{t('reader.saved')}</TextLink>}
      </View>
      {page === 'books' && <BookPicker open={open} translation={translation} go={go} initialBook={book} />}
      {page === 'search' && <>
        <TextInput accessibilityLabel={t('reader.query')} placeholder={t('reader.query')} placeholderTextColor={c.muted} value={query} onChangeText={setQuery} onSubmitEditing={() => submit(query.trim())} returnKeyType="search" maxLength={180} style={inputStyle} />
        <PillButton onPress={() => submit(query.trim())}>{t('reader.search')}</PillButton>
      </>}
      {data.failed && <Body>{t('reader.storageError')}</Body>}
      {data.failed && !data.ready && <TextLink onPress={() => void data.retry()}>{t('reader.retry')}</TextLink>}
      {current?.error && <TextLink onPress={() => retry(attempt + 1)}>{t('reader.retry')}</TextLink>}
      {!current && (page === 'chapter' || (page === 'search' && submitted)) && <Body>{t('reader.loading')}</Body>}
      {rows?.length === 0 && !current?.error && (page !== 'saved' || data.ready) && <Body>{t(page === 'saved' ? 'reader.emptySaved' : 'reader.empty')}</Body>}
      {rows?.map(verse => {
        const key = keyOf(translation, verse);
        const mark = data.value[key];
        const expanded = page === 'chapter' && (selected ?? target) === verse.verse;
        return <View key={key} onLayout={page === 'chapter' && verse.verse === target ? scrollToVerse : undefined} style={{ paddingTop: startsParagraph(verse.text) ? 8 : 0, backgroundColor: mark?.highlight ? c.card : undefined, borderLeftWidth: mark?.highlight ? 3 : 0, borderColor: c.accent, paddingLeft: mark?.highlight ? 8 : 0 }}>
          {page !== 'chapter' && <TextLink onPress={() => go('chapter', verse)}>{formatReference(verse, t.locale)}</TextLink>}
          <Text testID="scripture-text" onPress={page === 'chapter' ? () => select(expanded ? 0 : verse.verse) : undefined} accessibilityRole={page === 'chapter' ? 'button' : undefined} accessibilityState={page === 'chapter' ? { expanded, selected: expanded } : undefined} aria-expanded={page === 'chapter' ? expanded : undefined} style={{ fontFamily: fonts.serif, fontSize: 18, lineHeight: 30, color: c.ink }}>
            {page === 'chapter' && <Text style={{ fontFamily: fonts.mono, fontSize: 12, color: c.accent }}>{verse.verse}{'  '}</Text>}
            {displayRuns(verse.text).map((run, index) => <Text key={index} style={run.italic ? { fontStyle: "italic" } : undefined}>{run.text}</Text>)}
          </Text>
          {(expanded || page === 'saved') && <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18 }}>
            {savedAllowed && data.ready && <TextLink onPress={() => update(verse, 'saved')}>{t(mark?.saved ? 'reader.unsave' : 'reader.save')}</TextLink>}
            {savedAllowed && data.ready && <TextLink onPress={() => update(verse, 'highlight')}>{t(mark?.highlight ? 'reader.unhighlight' : 'reader.highlight')}</TextLink>}
            {canUse('shareCards', user) && <TextLink onPress={() => setShare(verse)}>{t('share.title')}</TextLink>}
          </View>}
          {share === verse && <ShareCard text={displayRuns(verse.text).map(run => run.text).join('')} credit={citation(formatReference(verse, t.locale), translation)} close={() => setShare(undefined)} />}
        </View>;
      })}
      {page === 'chapter' && <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {current?.previous && <TextLink onPress={() => go('chapter', current.previous)}>{t('reader.previous')}</TextLink>}
        {current?.next && <TextLink onPress={() => go('chapter', current.next)}>{t('reader.next')}</TextLink>}
      </View>}
    </Screen>
  );
}

function BookPicker({ open, translation, go, initialBook }: {
  open: (translation: Translation) => Promise<Bible>;
  translation: Translation;
  go: (page: BiblePage, location?: BibleLocation) => void;
  initialBook: string;
}) {
  const t = useT('journey');
  const [selected, select] = useState(initialBook);
  const [browsing, browse] = useState(false);
  const [count, setCount] = useState<number>();
  const [failed, setFailed] = useState(false);
  const [attempt, retry] = useState(0);
  useEffect(() => {
    let active = true;
    setCount(undefined);
    setFailed(false);
    void open(translation).then(db => lastChapter(db, selected)).then(last => {
      if (active) setCount(last);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [open, translation, selected, attempt]);
  return <>
    <Card>
      <TextLink onPress={() => browse(!browsing)}>{t(browsing ? 'reader.closeBooks' : 'reader.chooseBook')}</TextLink>
      <Label>{BOOKS.find(book => book.code === selected)?.[t.locale]}</Label>
      {failed ? <TextLink onPress={() => retry(attempt + 1)}>{t('reader.retry')}</TextLink> : count === undefined ? <Body>{t('reader.loading')}</Body> :
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {Array.from({ length: count }, (_, i) => <TextLink key={i} style={{ minWidth: 44, alignItems: 'center' }} onPress={() => go('chapter', { book: selected, chapter: i + 1 })}>{String(i + 1)}</TextLink>)}
        </View>}
    </Card>
    {browsing && BOOKS.map(book => <Card key={book.code} onPress={() => { select(book.code); browse(false); }} role="radio" selected={selected === book.code}><Body muted={false}>{book[t.locale]}</Body></Card>)}
  </>;
}
