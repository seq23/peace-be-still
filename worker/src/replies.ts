// Fixed replies, written by people, never by a model. A crisis reply is not labelled AI:
// a lifeline must not look machine-made. Read as the pastor pass before every change.
import type { CrisisKind } from './crisis';

export type Lang = 'en' | 'es';
type Band = 'teen' | 'adult';

const open = { en: "You matter, and you don't have to carry this alone.", es: 'Tú importas, y no tienes que cargar esto a solas.' };
const lifeline = {
  en: 'Please reach out right now to the 988 Suicide & Crisis Lifeline. Call or text 988, any time, day or night.',
  es: 'Por favor, comunícate ahora con la Línea 988 de Prevención del Suicidio y Crisis. Llama al 988 y oprime 2 para español, o envía un mensaje de texto al 988, a cualquier hora.',
};
const alsoLifeline = {
  en: 'If you ever think about ending your life, call or text 988.',
  es: 'Si alguna vez piensas en quitarte la vida, llama al 988 y oprime 2 para español, o envía un texto al 988.',
};
const danger = { en: 'If you are in danger this minute, call 911.', es: 'Si estás en peligro en este momento, llama al 911.' };
const dv = {
  en: 'Please reach out to the National Domestic Violence Hotline: call 1-800-799-7233 or text START to 88788, any time. What is happening to you is not your fault, and God does not ask you to stay in harm.',
  es: 'Por favor, comunícate con la Línea Nacional contra la Violencia Doméstica: llama al 1-800-799-7233 o envía START al 88788, a cualquier hora. Lo que te está pasando no es tu culpa, y Dios no te pide que te quedes donde te hacen daño.',
};
const childhelp = {
  en: 'Please call or text the Childhelp hotline at 1-800-422-4453, any time. What is happening is not your fault.',
  es: 'Por favor, llama o envía un texto a la línea de Childhelp al 1-800-422-4453, a cualquier hora. Lo que está pasando no es tu culpa.',
};
const trusted = {
  en: 'Please also tell a trusted adult today, like a parent, a school counselor or a pastor.',
  es: 'Por favor, cuéntale hoy también a un adulto de confianza, como tu mamá o tu papá, un consejero de la escuela o un pastor.',
};
// In abuse, the trusted adult must not send her back to the person hurting her (a parent's
// partner, a youth pastor): it names adults outside the home first.
const trustedSafe = {
  en: 'Please also tell an adult you trust today who is not the person hurting you, like a school counselor, a teacher or a relative.',
  es: 'Por favor, cuéntale hoy también a un adulto de confianza que no sea la persona que te hace daño, como un consejero de la escuela, un maestro o un familiar.',
};
// No one prays this message, so it never says "I am praying": it says what is true.
const close = { en: 'Someone is ready to listen right now.', es: 'Hay alguien listo para escucharte ahora mismo.' };

/** The fixed crisis reply. Abuse leads with the hotline for what is happening (Childhelp for a
 *  child or teen, the Domestic Violence Hotline for an adult), then 988 and 911. */
export function crisisText(kind: CrisisKind, lang: Lang, band: Band): string {
  const child = kind === 'child_abuse' || (kind === 'abuse' && band === 'teen');
  const parts = kind === 'selfharm'
    ? [open[lang], lifeline[lang], danger[lang]]
    : [open[lang], child ? childhelp[lang] : dv[lang], alsoLifeline[lang], danger[lang]];
  if (band === 'teen') parts.push(kind === 'selfharm' ? trusted[lang] : trustedSafe[lang]);
  parts.push(close[lang]);
  return parts.join(' ');
}

export const fallbackText = {
  en: "I couldn't put a good answer together just now. Hold on to this verse for a moment, then ask me again.",
  es: 'No pude armar una buena respuesta en este momento. Quédate con este versículo un momento y vuelve a preguntarme.',
};
// A rung failed for a moment (busy, a network blip) but today's allowances are not used up.
export const busyText = {
  en: 'Chat is busy for a moment. Give it a minute and send that again.',
  es: 'El chat está ocupado por un momento. Espera un minuto y vuelve a enviarlo.',
};
// CHAT_NO_FREE_MODEL: every free allowance is really used up for today (measured, not a guess).
export const noFreeModelText = {
  en: 'Chat is resting until tomorrow. Your Bible, today\'s story and the night sessions are all still here.',
  es: 'El chat descansa hasta mañana. Tu Biblia, la historia de hoy y las sesiones de la noche siguen aquí.',
};
export const limitText = {
  en: "That's today's chat. It opens again tomorrow, and your Bible is here any time.",
  es: 'Ese fue el chat de hoy. Mañana se abre de nuevo, y tu Biblia está aquí cuando quieras.',
};
// Asked for a verse in another translation: the app quotes only the KJV / RV1909, so it gives that
// verse in those words and says so once, plainly.
export const oneTranslationText = {
  en: 'I quote only the King James Version here, so here is that verse in its words.',
  es: 'Aquí cito solo la Reina-Valera 1909, así que este es ese versículo en sus palabras.',
};
// C08: asked whether it is real, a pastor, a person or God, it says plainly what it is.
export const identityText = {
  en: "I'm an AI helper, not a pastor, not a person and not God. I can talk things through and point you to scripture, but for prayer and care, your pastor and the people who love you matter more than I can.",
  es: 'Soy un asistente de IA, no un pastor, no una persona y no Dios. Puedo conversar contigo y mostrarte pasajes de la Biblia, pero para la oración y el cuidado, tu pastor y la gente que te quiere valen mucho más que yo.',
};
