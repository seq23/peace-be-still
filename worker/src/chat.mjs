import { crisisReply } from './crisis.mjs';
import { runLadder } from './ladder.mjs';

// The caller supplies admission and answer validation; both must fail closed.
// Crisis messages never reach admission, providers, memory, or logs.
export async function chat(input, { admit, providers, validate }) {
  if (!input || !['child', 'teen', 'adult'].includes(input.ageBand) ||
      !['gods-word', 'mindset'].includes(input.door) ||
      !['en', 'es'].includes(input.language) || typeof input.message !== 'string' ||
      !input.message.trim() || input.message.length > 4000) {
    return { status: 400, code: 'INVALID_REQUEST' };
  }
  if (input.ageBand === 'child') return { status: 403, code: 'CHAT_AGE_BLOCKED' };
  const crisis = crisisReply(input.message, input);
  if (crisis) return { status: 200, kind: 'crisis', text: crisis, ai: true };
  if (typeof admit !== 'function' || typeof validate !== 'function' || !Array.isArray(providers)) {
    return { status: 503, code: 'CHAT_NOT_CONFIGURED' };
  }
  const admission = await admit(input);
  if (!admission?.allowed) return { status: 429, code: admission?.code || 'CHAT_LIMIT' };
  // A direct question about the assistant's identity has a deterministic answer.
  // Keep it behind admission so this path cannot bypass the daily limits.
  if (/\b(?:are you (?:real|a (?:person|pastor)|god)|eres (?:real|una persona|un pastor|dios))\b/iu.test(input.message)) {
    return { status: 200, kind: 'answer', ai: true, answer: { text: input.language === 'es'
      ? 'Soy una ayuda de inteligencia artificial, no una persona ni un pastor.'
      : 'I am an AI helper, not a person or a pastor.', scripture: [] } };
  }
  const request = { ...input, voice: input.ageBand === 'teen' ? 'teen' : input.voice };
  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await runLadder(providers, request);
    if (!result.ok) return { status: 503, code: result.code };
    const checked = await validate(result.answer, request);
    if (checked?.ok) return { status: 200, kind: 'answer', answer: checked.answer, ai: true };
    request.objection = checked?.reason || 'Answer did not pass the safety checks.';
  }
  return { status: 200, kind: 'fallback', ai: true, text: input.language === 'es'
    ? 'Estoy aquí contigo. Podemos descansar en las palabras de Salmos 46:1.'
    : 'I am here with you. We can rest with the words of Psalm 46:1.' };
}
