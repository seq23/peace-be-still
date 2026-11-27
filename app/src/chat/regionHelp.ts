import type { Key, Language } from '../i18n';
import { CRISIS_LINES, FIND_HELPLINE, regionOf } from './crisisLines';

type Values = Record<string, string>;
/**
 * Help when chat cannot answer at all (offline, a server error, too fast): the message that failed
 * may have been a crisis, so every error note carries the crisis line for her region, from the one table the
 * server reads too (./crisisLines.ts). No region, or a region with no row, gets findahelpline.com. It is one
 * quiet line, not the crisis card's buttons: each [bracketed] part of the text is a tappable link, in the order of `links`.
 */
export function regionHelp(region: string | null, lang: Language = 'en'): { text: Key; values?: Values; links: Array<{ label: Key; values?: Values; url: string }> } {
  const r = regionOf(region);
  if (r === 'US') return { text: 'chat.help.us', links: [{ label: 'chat.call.988', url: 'tel:988' }, { label: 'chat.text.988', url: 'sms:988' }] };
  if (r === 'other') return { text: 'chat.help.other', links: [{ label: 'chat.findHelpline', url: FIND_HELPLINE }] };
  const row = CRISIS_LINES[r];
  const name = row.name?.[lang];
  return {
    text: name ? 'chat.help.named' : 'chat.help.line', values: { ...(name ? { name } : {}), line: row.line, emergency: row.emergency },
    links: [{ label: name ? 'chat.call.named' : 'chat.call.line', values: { ...(name ? { name } : {}), line: row.line }, url: `tel:${row.tel}` }, { label: 'chat.call.line', values: { line: row.emergency }, url: `tel:${row.emergency}` }],
  };
}
