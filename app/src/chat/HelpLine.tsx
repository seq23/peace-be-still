import { getLocales } from 'expo-localization';
import React from 'react';
import { Linking, Platform, Text, type TextStyle } from 'react-native';
import type { Key, Language } from '../i18n';
import { regionHelp } from './regionHelp';

/**
 * A crisis line link (tel:, sms: or a web page). On a phone the tap opens it through Linking. On the web preview it
 * is also a real <a href>, so the browser and a screen reader know it as that link (a role with no href is a link
 * to nowhere: the 27 Nov 2026 tap-through on main read "Call 988" as a dead button). The tap still opens it once,
 * through Linking; the anchor's own navigation is cancelled so the dialer never opens twice.
 */
export function lineLinkProps(url: string) {
  const onPress = (e?: { preventDefault?: () => void }) => { e?.preventDefault?.(); void Linking.openURL(url); };
  return Platform.OS === 'web' ? ({ href: url, onPress } as { onPress: typeof onPress }) : { onPress };
}

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
      return <Text key={j} accessibilityRole="link" accessibilityLabel={t(to.label, to.values)} {...lineLinkProps(to.url)} style={{ color: link, textDecorationLine: 'underline' }}>{part}</Text>;
    })}
  </Text>;
}
