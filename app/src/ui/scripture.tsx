import React from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { displayRuns } from '../bible/core';
import { fonts } from '../theme/tokens';

/**
 * The ONE way stored Scripture is drawn: the KJV's [supplied words] in italics, never brackets, and no
 * paragraph mark (displayRuns). Every screen that shows a verse (player, reader, daily verse) uses this.
 */
export function ScriptureText({ text, style, testID }: { text: string; style?: StyleProp<TextStyle>; testID?: string }) {
  return (
    <Text style={style} testID={testID}>
      {displayRuns(text).map((run, index) => run.italic
        ? <Text key={index} style={{ fontFamily: fonts.serifItalic }}>{run.text}</Text>
        : run.text)}
    </Text>
  );
}
