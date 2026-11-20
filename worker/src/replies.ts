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

// Medical danger (round 4, x10: Xanax with wine got only 988): what to do, in the order it matters,
// for what she wrote: medicine mixed with alcohol or extra doses; a child who swallowed something;
// a medicine she stopped. Poison Control (America's Poison Centers) is free, any hour, with
// interpreters in Spanish.
export type MedicalCase = 'mix' | 'child' | 'stopped';
export function medicalCase(text: string): MedicalCase {
  const t = ` ${text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  if (/ (?:baby|toddler|son|daughter|kid|kids|child|grandbaby|grandson|granddaughter|\d+ (?:year|month) old|bebe|nino|nina|hijo|hija|nieto|nieta) /.test(t) && / (?:swallowed|ate|drank|got into|se tomo|se trago|se comio|se bebio|agarro) /.test(t)) return 'child';
  if (/ (?:stopped|quit|stop taking|came off|dejo|deje|deje de tomar|ya no tomo|suspendi) /.test(t) && !/ (?:wine|alcohol|drink\w*|beer|vino|cerveza\w*|tragos?) /.test(t)) return 'stopped';
  return 'mix';
}
const medical: Record<MedicalCase, Record<Lang, string[]>> = {
  mix: {
    en: [
      "Please don't take any extra, and don't mix medicine with alcohol. Sleep, anxiety or pain pills taken with alcohol or in extra doses can slow or stop breathing.",
      'If they have already been taken, call Poison Control now at 1-800-222-1222. It is free, any time.',
      'If someone is very sleepy, hard to wake or breathing slowly, call 911 now.',
      'A pharmacist can tell you what is safe for sleep tonight.',
      'If you are thinking about ending your life, call or text 988.',
    ],
    es: [
      'Por favor, no tomes ninguna dosis extra y no mezcles medicinas con alcohol. Las pastillas para dormir, para la ansiedad o para el dolor, con alcohol o en dosis extra, pueden hacer que la respiración se vuelva lenta o se detenga.',
      'Si ya se tomaron, llama ahora al Centro de Envenenamientos al 1-800-222-1222. Es gratis, a cualquier hora, y atienden en español.',
      'Si alguien está muy dormido, no despierta bien o respira despacio, llama al 911 ahora.',
      'Un farmacéutico te puede decir qué es seguro para dormir esta noche.',
      'Si estás pensando en quitarte la vida, llama al 988 y oprime 2 para español, o envía un texto al 988.',
    ],
  },
  child: {
    en: [
      'Please call Poison Control now at 1-800-222-1222, even if your child seems fine. They will tell you exactly what to do. It is free, any time.',
      'If your child is very sleepy, hard to wake, having trouble breathing or having a seizure, call 911 now.',
      'Keep the bottle or package with you for the call.',
    ],
    es: [
      'Por favor, llama ahora al Centro de Envenenamientos al 1-800-222-1222, aunque tu hijo o hija parezca estar bien. Te dirán exactamente qué hacer. Es gratis, a cualquier hora, y atienden en español.',
      'Si está muy dormido, no despierta bien, le cuesta respirar o tiene una convulsión, llama al 911 ahora.',
      'Ten a la mano el frasco o el paquete para la llamada.',
    ],
  },
  stopped: {
    en: [
      'Please call your doctor today about the medicine you stopped. Stopping some medicines all at once, like insulin or blood pressure, heart or seizure medicine, can be dangerous. Faith and treatment go together.',
      'If you feel very sick, faint, or have chest pain, confusion or trouble breathing, call 911 now.',
      'If you have taken too much of anything, call Poison Control at 1-800-222-1222, any time.',
      'If you are thinking about ending your life, call or text 988.',
    ],
    es: [
      'Por favor, llama hoy a tu médico sobre la medicina que dejaste. Dejar de golpe algunas medicinas, como la insulina o las de la presión, el corazón o las convulsiones, puede ser peligroso. La fe y el tratamiento van juntos.',
      'Si te sientes muy mal, te desmayas, o tienes dolor de pecho, confusión o te cuesta respirar, llama al 911 ahora.',
      'Si tomaste demasiado de algo, llama al Centro de Envenenamientos al 1-800-222-1222, a cualquier hora.',
      'Si estás pensando en quitarte la vida, llama al 988 y oprime 2 para español, o envía un texto al 988.',
    ],
  },
};

/** The fixed crisis reply. Abuse leads with the hotline for what is happening (Childhelp for a
 *  child or teen, the Domestic Violence Hotline for an adult), then 988 and 911. Medical danger
 *  leads with what not to do, then Poison Control, 911, her doctor, then 988. */
export function crisisText(kind: CrisisKind, lang: Lang, band: Band, herText = ''): string {
  if (kind === 'medical') return [...medical[medicalCase(herText)][lang], ...(band === 'teen' ? [trusted[lang]] : []), close[lang]].join(' ');
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
