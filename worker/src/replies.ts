// Fixed replies, written by people, never by a model. A crisis reply is not labelled AI:
// a lifeline must not look machine-made. Read as the pastor pass before every change.
import type { CrisisKind } from './crisis';

export type Lang = 'en' | 'es';
type Band = 'teen' | 'adult';
// The Mindset door has no faith words anywhere (hostile review F8): every reply that names God, a
// verse, scripture or a pastor has a Mindset version, and every hotline stays.
export type Door = 'faith' | 'mindset';

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
// An adult dating a teen (run 44856144997 x12: the reply never said plainly it is wrong).
const groomed = {
  en: 'An adult who dates or touches someone your age is doing something wrong, even when it feels like love.',
  es: 'Un adulto que tiene una relación de pareja con alguien de tu edad está haciendo algo malo, aunque se sienta como amor.',
};
const DATING = / (?:boyfriend|girlfriend|dating|date|in love|relationship|novio|novia|saliendo|enamorad\w*|relacion) /;
const childhelp = {
  en: 'Please call or text the Childhelp hotline at 1-800-422-4453, any time. What is happening is not your fault.',
  es: 'Por favor, llama o envía un texto a la línea de Childhelp al 1-800-422-4453, a cualquier hora. Lo que está pasando no es tu culpa.',
};
const trusted = {
  en: 'Please also tell a trusted adult today, like a parent, a school counselor or a pastor.',
  es: 'Por favor, cuéntale hoy también a un adulto de confianza, como tu mamá o tu papá, un consejero de la escuela o un pastor.',
};
const trustedMindset = {
  en: 'Please also tell a trusted adult today, like a parent or a school counselor.',
  es: 'Por favor, cuéntale hoy también a un adulto de confianza, como tu mamá o tu papá o un consejero de la escuela.',
};
const dvMindset = {
  en: 'Please reach out to the National Domestic Violence Hotline: call 1-800-799-7233 or text START to 88788, any time. What is happening to you is not your fault, and you deserve to be safe.',
  es: 'Por favor, comunícate con la Línea Nacional contra la Violencia Doméstica: llama al 1-800-799-7233 o envía START al 88788, a cualquier hora. Lo que te está pasando no es tu culpa, y mereces estar a salvo.',
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
export function crisisText(kind: CrisisKind, lang: Lang, band: Band, herText = '', door: Door = 'faith'): string {
  const mind = door === 'mindset';
  const trust = mind ? trustedMindset : trusted;
  if (kind === 'medical') return [...medical[medicalCase(herText)][lang].map(line => mind ? line.replace(/ Faith and treatment go together\.| La fe y el tratamiento van juntos\./, '') : line), ...(band === 'teen' ? [trust[lang]] : []), close[lang]].join(' ');
  const child = kind === 'child_abuse' || (kind === 'abuse' && band === 'teen');
  const parts = kind === 'selfharm'
    ? [open[lang], lifeline[lang], danger[lang]]
    : [open[lang], ...(child && band === 'teen' && DATING.test(` ${herText.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ')} `) ? [groomed[lang]] : []), child ? childhelp[lang] : mind ? dvMindset[lang] : dv[lang], alsoLifeline[lang], danger[lang]];
  if (band === 'teen') parts.push(kind === 'selfharm' ? trust[lang] : trustedSafe[lang]);
  parts.push(close[lang]);
  return parts.join(' ');
}

export const fallbackText = {
  en: "I couldn't put a good answer together just now. Hold on to this verse for a moment, then ask me again.",
  es: 'No pude armar una buena respuesta en este momento. Quédate con este versículo un momento y vuelve a preguntarme.',
};
// Mindset: no verse is printed under it.
export const fallbackMindsetText = {
  en: "I couldn't put a good answer together just now. Take one slow breath, then ask me again.",
  es: 'No pude armar una buena respuesta en este momento. Respira despacio una vez y vuelve a preguntarme.',
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
export const noFreeModelMindsetText = {
  en: 'Chat is resting until tomorrow. Your night sessions are all still here.',
  es: 'El chat descansa hasta mañana. Tus sesiones de la noche siguen aquí.',
};
export const limitText = {
  en: "That's today's chat. It opens again tomorrow, and your Bible is here any time.",
  es: 'Ese fue el chat de hoy. Mañana se abre de nuevo, y tu Biblia está aquí cuando quieras.',
};
export const limitMindsetText = {
  en: "That's today's chat. It opens again tomorrow.",
  es: 'Ese fue el chat de hoy. Mañana se abre de nuevo.',
};
// Asked for a verse in another translation: the app quotes only the KJV / RV1909, so it gives that
// verse in those words and says so once, plainly.
export const oneTranslationText = {
  en: 'I quote only the King James Version here, so here is that verse in its words.',
  es: 'Aquí cito solo la Reina-Valera 1909, así que este es ese versículo en sus palabras.',
};
// C08: asked whether it is real, a pastor, a person or God, it says plainly what it is.
export const identityMindsetText = {
  en: "I'm an AI helper, not a person. I can help you think things through, but the people who care about you, and a counselor or doctor when you need one, can do far more than I can.",
  es: 'Soy un asistente de IA, no una persona. Puedo ayudarte a pensar las cosas con calma, pero la gente que te quiere, y un consejero o un médico cuando lo necesites, pueden hacer mucho más que yo.',
};
export const identityText = {
  en: "I'm an AI helper, not a pastor, not a person and not God. I can talk things through and point you to scripture, but for prayer and care, your pastor and the people who love you matter more than I can.",
  es: 'Soy un asistente de IA, no un pastor, no una persona y no Dios. Puedo conversar contigo y mostrarte pasajes de la Biblia, pero para la oración y el cuidado, tu pastor y la gente que te quiere valen mucho más que yo.',
};

// Hostile review F5: people who needed an answer got the generic fallback. For the topics that kept
// falling back, a short answer written by a person stands in for it (faith door; Mindset keeps the
// plain fallback). Each is shown as a fixed answer, labelled AI like every chat reply.
export type Topic = 'teen_grief' | 'money' | 'cursing' | 'jailbreak';
export function fallbackTopic(text: string, teen: boolean): Topic | null {
  const t = ` ${text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[‘’'`´]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ')} `;
  if (/ (?:ignore (?:all|your|the|previous|prior|these)|system prompt|you are now|you are dan|new rules|developer mode|pretend (?:to be|you are)|jailbreak|olvida (?:tus|las) reglas|ahora eres|nuevas reglas) /.test(t)) return 'jailbreak';
  if (/ (?:curse|cuss|cussing|swear word|swear words|bad word|bad words|say a (?:bad|dirty) word|groseria\w*|maldicion\w*|palabrota\w*|mala palabra) /.test(t)) return 'cursing';
  if (teen && / (?:died|dies|dead|death|passed away|killed|funeral|murio|fallecio|muerte|se mato) /.test(t)) return 'teen_grief';
  // Only a seed, a tithe or a prayer to make a debt vanish (RT16, RT17): a lost job or a question about
  // a psalm is answered by the model (run 44856144997: q03 and q04 got this text and failed).
  if (/ (?:seed|sow|sowing|tithe\w*|offering|semilla|sembrar|diezmo\w*|ofrenda) /.test(t) || / (?:pray|praying|ora|orar|oren) (?:\w+ ){0,3}(?:debt|debts|bills?|deuda\w*|cuentas) (?:away|go|gone|disappear|desaparec\w*)/.test(t)) return 'money';
  return null;
}
export const topicText: Record<Topic, Record<Lang, string>> = {
  teen_grief: {
    en: "I'm so sorry. Losing a friend like this is one of the hardest things there is, and it is okay to be angry, numb or full of questions, even angry with God. You can tell Him exactly how you feel; the Psalms are full of people who did (Psalm 13 is one). Please talk with someone who can sit with you in this, like a parent, a school counselor or your youth pastor. Lord, stay close to this grief and to every heart that is broken by it.",
    es: 'Lo siento mucho. Perder a un amigo así es de lo más difícil que hay, y está bien sentir enojo, vacío o muchas preguntas, incluso enojo con Dios. Puedes decirle exactamente cómo te sientes; los Salmos están llenos de personas que lo hicieron (el Salmo 13 es uno). Por favor, habla con alguien que pueda acompañarte en esto, como tu mamá o tu papá, un consejero de la escuela o tu líder de jóvenes. Señor, quédate cerca de este dolor y de cada corazón que hoy está roto.',
  },
  money: {
    en: "God cares about the bills and the deadline, not only about the big questions. Giving is never a way to buy a blessing, and no prayer works like a payment; God is not paid to help you. Today, write down what is due and when, and call the people you owe to ask about a plan; many churches and local programs also help with rent and utilities. Father, we bring You this debt and this week. Give wisdom for each call, courage to ask for help, and Your peace while we wait.",
    es: 'A Dios le importan las cuentas y la fecha límite, no solo las grandes preguntas. Dar nunca es una forma de comprar una bendición, y ninguna oración funciona como un pago; a Dios no se le paga para que ayude. Hoy, anota lo que debes y para cuándo, y llama a quienes les debes para pedir un plan; muchas iglesias y programas locales también ayudan con la renta y los servicios. Padre, te traemos esta deuda y esta semana. Danos sabiduría para cada llamada, valor para pedir ayuda y tu paz mientras esperamos.',
  },
  cursing: {
    en: "I'll pass on the cursing, but I'm glad to keep talking. If something has you angry or worn out, you can say it plainly here, and you can say it to God too; He can handle honest words. Tell me what is going on.",
    es: 'Las groserías las dejo pasar, pero con gusto seguimos hablando. Si algo te tiene enojado o cansado, puedes decirlo con claridad aquí, y también decírselo a Dios; Él puede con las palabras honestas. Cuéntame qué está pasando.',
  },
  jailbreak: {
    en: "I'll stay what I am: an AI helper in a Bible app, not God, not Jesus and not a pastor, so I can't speak in their place or promise what they will do. I'm glad to talk about what you are carrying and what Scripture says about it. What is on your heart?",
    es: 'Seguiré siendo lo que soy: un asistente de IA en una app de la Biblia, no Dios, no Jesús y no un pastor, así que no puedo hablar en su lugar ni prometer lo que harán. Con gusto hablamos de lo que estás cargando y de lo que dice la Escritura al respecto. ¿Qué hay en tu corazón?',
  },
};
