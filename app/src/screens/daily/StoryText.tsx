// One story as it reads on the page: retelling apart from scripture (QUALITY.md S02), scripture in Caslon with its
// reference and translation, the AI label (S13), and Hush Harbor's "Say it with me" with the listener's lines.
import React from 'react';
import { Text, View } from 'react-native';
import { formatReference, parseReference } from '../../bible/core';
import { useStoredVerses, VerseText } from './DeclarationVerse';
import type { Block, Story } from '../../content';
import { useT } from '../../settings';
import { fonts } from '../../theme/tokens';
import { Body, Card, Label, usePalette } from '../../ui';

function Scripture({ block }: { block: Extract<Block, { type: 'scripture' }> }) {
  const t = useT('journey');
  const c = usePalette();
  const ref = parseReference(block.ref);
  const verses = useStoredVerses(block.ref, block.translation);
  return <View style={{ gap: 4, borderLeftWidth: 2, borderColor: c.line, paddingLeft: 12 }}>
    {verses ? <VerseText verses={verses} style={{ fontFamily: fonts.serif, fontSize: 17, lineHeight: 26, color: c.ink }} />
      : <Body size={14}>{t(verses === undefined ? 'reader.loading' : 'daily.verseUnavailable')}</Body>}
    <Label>{`${ref ? formatReference(ref, t.locale) : block.ref} · ${t(block.translation === 'KJV' ? 'story.kjv' : 'story.rv')}`}</Label>
  </View>;
}

export function StoryText({ story }: { story: Story }) {
  const t = useT('journey');
  const c = usePalette();
  return <View style={{ gap: 14 }}>
    <Body size={14}>{t('story.ai')}</Body>
    {story.blocks.map((block, index) => {
      if (block.type === 'scripture') return <Scripture key={index} block={block} />;
      if (block.type === 'call') return <Card key={index} style={{ gap: 8 }}>
        <Label>{t('story.sayWithMe')}</Label>
        {block.parts.map((part, at) => 'say' in part
          ? <Body key={at} muted={false}>{part.say}</Body>
          : <Text key={at} style={{ fontFamily: fonts.strong, fontSize: 17, color: c.accent }}>{t('story.yourLine', { line: part.screen })}</Text>)}
      </Card>;
      const startsRun = index === 0 || story.blocks[index - 1].type !== 'retelling';
      return <View key={index} style={{ gap: 4 }}>
        {startsRun && <Label>{t('daily.retelling')}</Label>}
        <Body muted={false} size={17}>{block.text}</Body>
      </View>;
    })}
  </View>;
}
