// Fixed replies, written by people, never by a model. A crisis reply is not labelled AI:
// a lifeline must not look machine-made. Read as the pastor pass before every change.
import type { CrisisKind } from './crisis';

export type Lang = 'en' | 'es';
type Band = 'teen' | 'adult';

const open = { en: "You matter, and you don't have to carry this alone.", es: 'Tú importas, y no tienes que cargar esto a solas.' };
const lifeline = {
  en: 'Please reach out right now to the 988 Suicide & Crisis Lifeline. Call or text 988, any time, day or night. If you are in danger this minute, call 911.',
  es: 'Por favor, comunícate ahora con la Línea 988 de Prevención del Suicidio y Crisis. Llama al 988 y oprime 2 para español, o envía un mensaje de texto al 988, a cualquier hora. Si estás en peligro en este momento, llama al 911.',
};
const dv = {
  en: 'The National Domestic Violence Hotline is there for you too: call 1-800-799-7233. What is happening to you is not your fault, and God does not ask you to stay in harm.',
  es: 'La Línea Nacional contra la Violencia Doméstica también está para ti: llama al 1-800-799-7233. Lo que te está pasando no es tu culpa, y Dios no te pide que te quedes donde te hacen daño.',
};
const childhelp = {
  en: 'You can also call the Childhelp hotline at 1-800-422-4453. What is happening is not your fault.',
  es: 'También puedes llamar a la línea de Childhelp al 1-800-422-4453. Lo que está pasando no es tu culpa.',
};
const trusted = {
  en: 'Please also tell a trusted adult today, like a parent, a school counselor or a pastor.',
  es: 'Por favor, cuéntale hoy también a un adulto de confianza, como tu mamá o tu papá, un consejero de la escuela o un pastor.',
};
const close = { en: 'I am praying you reach someone tonight.', es: 'Estoy orando para que hables con alguien esta noche.' };

export function crisisText(kind: CrisisKind, lang: Lang, band: Band): string {
  const parts = [open[lang], lifeline[lang]];
  if (kind === 'abuse') parts.push(band === 'teen' ? childhelp[lang] : dv[lang]);
  if (band === 'teen') parts.push(trusted[lang]);
  parts.push(close[lang]);
  return parts.join(' ');
}

export const fallbackText = {
  en: "I couldn't put a good answer together just now. Hold on to this verse for a moment, then ask me again.",
  es: 'No pude armar una buena respuesta en este momento. Quédate con este versículo un momento y vuelve a preguntarme.',
};
// CHAT_NO_FREE_MODEL: every free allowance is used up for today.
export const noFreeModelText = {
  en: 'Chat is resting until tomorrow. Your Bible, today\'s story and the night sessions are all still here.',
  es: 'El chat descansa hasta mañana. Tu Biblia, la historia de hoy y las sesiones de la noche siguen aquí.',
};
export const limitText = {
  en: "That's today's chat. It opens again tomorrow, and your Bible is here any time.",
  es: 'Ese fue el chat de hoy. Mañana se abre de nuevo, y tu Biblia está aquí cuando quieras.',
};
// C08: asked whether it is real, a pastor, a person or God, it says plainly what it is.
export const identityText = {
  en: "I'm an AI helper, not a pastor, not a person and not God. I can talk things through and point you to scripture, but for prayer and care, your pastor and the people who love you matter more than I can.",
  es: 'Soy un asistente de IA, no un pastor, no una persona y no Dios. Puedo conversar contigo y mostrarte pasajes de la Biblia, pero para la oración y el cuidado, tu pastor y la gente que te quiere valen mucho más que yo.',
};
