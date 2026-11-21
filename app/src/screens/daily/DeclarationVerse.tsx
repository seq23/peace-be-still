import React, { useEffect, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { bible, displayRuns, formatReference, parseReference, type Translation, type Verse } from '../../bible';
import { useT } from '../../settings';
import { Body } from '../../ui';

/** One verse or a short run of verses, always read from the bundled KJV or RV1909, never typed or copied. */
export function useStoredVerses(passage: string, translation: Translation) {
  const request = `${translation}:${passage}`;
  const [result, setResult] = useState<{ request: string; verses: Verse[] | null }>();
  useEffect(() => {
    let active = true;
    const ref = parseReference(passage);
    if (!ref?.verse) {
      setResult({ request, verses: null });
      return;
    }
    const { book, chapter, verse } = ref;
    const end = ref.endVerse ?? verse;
    void bible(translation).then(db => end === verse
      ? db.verse(book, chapter, verse).then(row => row ? [row] : [])
      : db.chapter(book, chapter).then(rows => rows.filter(row => row.verse >= verse && row.verse <= end)),
    ).then(
      rows => { if (active) setResult({ request, verses: rows.length ? rows : null }); },
      () => { if (active) setResult({ request, verses: null }); },
    );
    return () => { active = false; };
  }, [passage, translation, request]);
  return result?.request === request ? result.verses : undefined;
}

export function VerseText({ verses, style }: { verses: Verse[]; style?: StyleProp<TextStyle> }) {
  return <Text testID="scripture-text" style={style}>
    {verses.flatMap((verse, index) => [...(index ? [{ text: ' ', italic: false }] : []), ...displayRuns(verse.text)]).map((run, index) =>
      <Text key={index} style={run.italic ? { fontStyle: 'italic' } : undefined}>{run.text}</Text>)}
  </Text>;
}

export function DeclarationVerse({ passage }: { passage: string }) {
  const t = useT('journey');
  const translation = t.locale === 'es' ? 'RV1909' : 'KJV';
  const verses = useStoredVerses(passage, translation);
  if (verses === undefined) return <Body size={14}>{t('reader.loading')}</Body>;
  if (!verses) return <Body size={14}>{t('daily.verseUnavailable')}</Body>;
  return <Body size={14}>
    <VerseText verses={verses} />
    {'\n'}{formatReference(parseReference(passage)!, t.locale)} · {translation}
  </Body>;
}
