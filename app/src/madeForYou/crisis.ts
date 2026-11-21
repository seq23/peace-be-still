import type { Language } from '../model';

// One-tap help under a crisis reply, the same lines as chat's crisisLinks (phase 3,
// app/src/chat/ChatScreen.tsx) read from the same fixed crisis text: the hotline the reply leads with
// first, then 911 when the reply names it, then 988 always. INTEGRATION: once chat is on main, import
// chat's crisisLinks here (one list for both) and delete this file.
export function crisisLinks(text: string, lang: Language): Array<{ label: string; url: string }> {
  const es = lang === 'es';
  const call = (n: string) => (es ? `Llamar al ${n}` : `Call ${n}`);
  const sms = (n: string) => (es ? `Enviar un texto al ${n}` : `Text ${n}`);
  const links: Array<{ label: string; url: string }> = [];
  if (text.includes('1-800-222-1222')) {
    links.push({ label: es ? 'Llamar a Control de Envenenamientos 1-800-222-1222' : 'Call Poison Control 1-800-222-1222', url: 'tel:18002221222' });
  }
  if (text.includes('911')) links.push({ label: call('911'), url: 'tel:911' });
  if (text.includes('1-800-422-4453')) links.push({ label: call('1-800-422-4453'), url: 'tel:18004224453' }, { label: sms('1-800-422-4453'), url: 'sms:18004224453' });
  if (text.includes('1-800-799-7233')) {
    links.push({ label: call('1-800-799-7233'), url: 'tel:18007997233' }, { label: es ? 'Enviar START al 88788' : 'Text START to 88788', url: 'sms:88788?body=START' });
  }
  links.push({ label: call('988'), url: 'tel:988' }, { label: sms('988'), url: 'sms:988' });
  return links;
}

/** The chat's own fixed 988 reply (phase 3 worker/src/replies.ts), for the preview's crisis screen. */
export const previewCrisisText: Record<Language, string> = {
  en: 'Please reach out right now to the 988 Suicide & Crisis Lifeline. Call or text 988, any time, day or night.',
  es: 'Por favor, comunícate ahora con la Línea 988 de Prevención del Suicidio y Crisis. Llama al 988 y oprime 2 para español, o envía un mensaje de texto al 988, a cualquier hora.',
};
