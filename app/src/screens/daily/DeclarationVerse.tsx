import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { bible, displayRuns, formatReference, parseReference, type Verse } from '../../bible';
import { useT } from '../../settings';
import { Body } from '../../ui';

export function DeclarationVerse({ passage }: { passage: string }) {
  const t = useT('journey');
  const translation = t.locale === 'es' ? 'RV1909' : 'KJV';
  const request = `${translation}:${passage}`;
  const [result, setResult] = useState<{ request: string; verse: Verse | null }>();

  useEffect(() => {
    let active = true;
    const ref = parseReference(passage);
    if (!ref?.verse) return;
    const { book, chapter, verse } = ref;
    void bible(translation).then(db => db.verse(book, chapter, verse)).then(
      row => { if (active) setResult({ request, verse: row }); },
      () => { if (active) setResult({ request, verse: null }); },
    );
    return () => { active = false; };
  }, [passage, translation, request]);

  if (result?.request !== request) return <Body size={14}>{t('reader.loading')}</Body>;
  if (!result.verse) return <Body size={14}>{t('daily.verseUnavailable')}</Body>;
  const verse = result.verse;
  return <Body size={14}>
    <Text testID="scripture-text">{displayRuns(verse.text).map((run, index) =>
      <Text key={index} style={run.italic ? { fontStyle: 'italic' } : undefined}>{run.text}</Text>,
    )}</Text>
    {'\n'}{formatReference(verse, t.locale)} · {translation}
  </Body>;
}
