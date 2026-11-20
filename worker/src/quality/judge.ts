// The judge: one cheap free-model read of MEANING after the code floor passes (C06/C07 red lines,
// C09-C12 voice score, verse fit). It reads her question, the answer and the stored verse texts.
// It can only fail an answer; it never approves on its own. Down = the code floor stands alone.
import { judgePrompt, voiceRubric, type PromptId } from '../prompts';
import type { Message } from '../providers/types';

export type JudgeInput = { voice: PromptId; question: string; text: string; verses: Array<{ ref: string; text: string }> };
export type JudgeVerdict = { verdict: 'pass'; voice: number | null } | { verdict: 'fail'; which: string[]; voice: number | null } | { verdict: 'down' };
export const JUDGE_CHECKS = ['speaks_as_god', 'prophecy', 'salvation_claim', 'outcome_promise', 'stop_medicine', 'prosperity', 'partisan', 'condemns', 'roleplay', 'verse_implies_promise', 'verse_harsh_for_moment', 'verse_off_topic', 'verse_read_in'] as const;
export const judgeSchema = { type: 'object', properties: { ...Object.fromEntries(JUDGE_CHECKS.map(k => [k, { type: 'boolean' }])), voice: { type: 'integer', minimum: 1, maximum: 5 } }, required: [...JUDGE_CHECKS, 'voice'], additionalProperties: false };
export const VOICE_PASS = 4; // QUALITY C09-C12: 4/5 or better

const q = (s: string) => s.slice(0, 2000).replace(/"""/g, '"');

export function judgeMessages(input: JudgeInput): Message[] {
  const verses = input.verses.length ? input.verses.map(v => `${v.ref}: ${q(v.text)}`).join('\n') : '(none)';
  return [
    { role: 'system', content: judgePrompt.replace('{RUBRIC}', voiceRubric[input.voice]) },
    { role: 'user', content: `Her question:\n"""\n${q(input.question)}\n"""\nThe answer:\n"""\n${q(input.text)}\n"""\nVerses printed under it:\n"""\n${verses}\n"""` },
  ];
}

/** Reads the judge's JSON (one boolean per check, a voice score). A voice score under 4 is a fail. */
export function judgeVerdict(data: unknown): JudgeVerdict {
  if (!data || typeof data !== 'object') return { verdict: 'down' };
  const d = data as Record<string, unknown>;
  if (!JUDGE_CHECKS.every(k => typeof d[k] === 'boolean')) return { verdict: 'down' };
  const voice = typeof d.voice === 'number' && d.voice >= 1 && d.voice <= 5 ? Math.round(d.voice) : null;
  const which: string[] = JUDGE_CHECKS.filter(k => d[k] === true);
  if (voice !== null && voice < VOICE_PASS) which.push('voice_low');
  return which.length ? { verdict: 'fail', which, voice } : { verdict: 'pass', voice };
}
