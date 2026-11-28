import { getLocales } from 'expo-localization';
import React from 'react';
import { Linking, Text, type TextStyle } from 'react-native';
import type { Key, Language } from '../i18n';
import { regionHelp } from './regionHelp';

/** The phone's region (never its language): it picks the crisis line. Unreadable is null. */
export function phoneRegion(): string | null {
  try { return getLocales()[0]?.regionCode ?? null; } catch { return null; }
}

/**
 * The one crisis help line for the phone's region, with its [bracketed] words as links (chat error notes, the
 * chat disclosure, the grief card). A Korean phone in the US gets 988; the language never picks the line.
 */
export function HelpLine({ region, t, style, link, testID }: { region: string | null; t: ((key: Key, values?: Record<string, string>) => string) & { locale?: Language }; style: TextStyle | TextStyle[]; link: string; testID?: string }) {
  const help = regionHelp(region, t.locale);
  const parts = t(help.text, help.values).split(/\[([^\]]+)\]/);
  return <Text testID={testID} style={style}>
    {parts.map((part, j) => {
      if (j % 2 === 0) return part;
      const to = help.links[(j - 1) / 2];
      return <Text key={j} accessibilityRole="link" accessibilityLabel={t(to.label, to.values)} onPress={() => void Linking.openURL(to.url)} style={{ color: link, textDecorationLine: 'underline' }}>{part}</Text>;
    })}
  </Text>;
}
