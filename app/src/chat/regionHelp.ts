import type { Key } from '../i18n';

/**
 * Help when chat cannot answer at all (offline, a server error, too fast): the message that failed
 * may have been a crisis, so every error note carries the crisis line for her region (the server picks
 * the same lines by the same region; missing means US). It is one quiet line, not the crisis card's
 * buttons: each [bracketed] part of the text is a tappable link, in the order of `links`.
 */
export function regionHelp(region: string | null): { text: Key; links: Array<{ label: Key; url: string }> } {
  const r = region ?? 'US';
  if (r === 'US') return { text: 'chat.help.us', links: [{ label: 'chat.call.988', url: 'tel:988' }, { label: 'chat.text.988', url: 'sms:988' }] };
  if (r === 'MX') return { text: 'chat.help.mx', links: [{ label: 'chat.call.mx', url: 'tel:8009112000' }, { label: 'chat.call.911', url: 'tel:911' }] };
  if (r === 'ES') return { text: 'chat.help.es', links: [{ label: 'chat.call.024', url: 'tel:024' }, { label: 'chat.call.112', url: 'tel:112' }] };
  return { text: 'chat.help.other', links: [{ label: 'chat.findHelpline', url: 'https://findahelpline.com' }] };
}
