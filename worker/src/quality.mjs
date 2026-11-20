import { insertScripture } from './scripture.mjs';

// These are deterministic red-line gates, not a substitute for the editorial
// review required for the prompts. Reject and retry rather than edit meaning.
const redLines = [
  /\b(?:i am (?:the lord|jesus|god)|god told me to tell you|my child,? i have|you are (?:saved|lost|going to hell)|seed faith|give (?:money )?to be blessed)\b/iu,
  /\b(?:god will (?:heal|cure)|stop (?:taking )?(?:your )?(?:medicine|medication)|skip (?:your |the )?doctor|your money is coming)\b/iu,
  /\b(?:what is|tell me|give me) (?:your|their|his|her) (?:full name|address|phone number|church name)\b/iu,
  /\b(?:fuck|shit|bitch|puta|mierda|joder)\b/iu,
];
const faithBanned = /\b(?:manifest(?:ing|ation)?|law of assumption|neville|speak life|black bible stories|urban)\b/iu;
const teenBanned = /\b(?:don['’]t tell your parents|keep this (?:a )?secret|sexually explicit)\b/iu;

export function validateAnswer(answer, input, verses) {
  const scripture = insertScripture(answer, verses);
  if (!scripture.ok) return scripture;
  const text = answer.text;
  if (redLines.some(pattern => pattern.test(text))) return { ok: false, reason: 'RED_LINE' };
  if (input.door === 'gods-word' && faithBanned.test(text)) return { ok: false, reason: 'FAITH_BOUNDARY' };
  if (input.ageBand === 'teen' && teenBanned.test(text)) return { ok: false, reason: 'TEEN_SAFETY' };
  if (input.language === 'es' && /\b(?:vosotros|vosotras)\b/iu.test(text)) return { ok: false, reason: 'SPANISH_VOICE' };
  const words = text.trim().split(/\s+/u).length;
  if (words > (input.ageBand === 'teen' ? 150 : 225) || answer.references.length > 3) return { ok: false, reason: 'ANSWER_LENGTH' };
  return scripture;
}
