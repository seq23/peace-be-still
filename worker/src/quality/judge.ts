// The judge: one cheap read of MEANING after the code floor passes (C06/C07 red lines, C09-C12 voice
// score, verse fit, doctrine, the shape of an answer to this question). It reads her question, what
// else she wrote in this chat, the answer and the stored verse texts.
// It can only fail an answer; it never approves on its own. Down = the code floor stands alone.
// JUDGE_CHECKS are shared with the Made for you session judge (its own prompt, this schema); CHAT_CHECKS
// are about a chat reply to a question (a bedtime session talks about the night and asks for no pastor).
import { judgePrompt, voiceRubric, type PromptId } from '../prompts';
import type { Message } from '../providers/types';

export type JudgeInput = { voice: PromptId; question: string; earlier?: string; text: string; verses: Array<{ ref: string; text: string }> };
export type JudgeVerdict = { verdict: 'pass'; voice: number | null } | { verdict: 'fail'; which: string[]; voice: number | null } | { verdict: 'down' };
export const JUDGE_CHECKS = ['speaks_as_god', 'prophecy', 'salvation_claim', 'outcome_promise', 'stop_medicine', 'prosperity', 'partisan', 'condemns', 'roleplay', 'verse_implies_promise', 'verse_harsh_for_moment', 'verse_off_topic', 'verse_read_in', 'garbled', 'image_unfit', 'assumes_gender'] as const;
// Moved from answer.ts keyword lists (Open Loops PBS_GATE_KEYWORD_LISTS): each reads what HER question means.
export const CHAT_CHECKS = ['churches_differ', 'missing_pastor', 'missing_prayer', 'night_opening', 'echo_opening', 'unasked_ai'] as const;
const schemaFor = (keys: readonly string[]) => ({ type: 'object', properties: { ...Object.fromEntries(keys.map(k => [k, { type: 'boolean' }])), voice: { type: 'integer', minimum: 1, maximum: 5 } }, required: [...keys, 'voice'], additionalProperties: false });
export const judgeSchema = schemaFor(JUDGE_CHECKS);
export const chatJudgeSchema = schemaFor([...JUDGE_CHECKS, ...CHAT_CHECKS]);
// The paid chat judge names only what failed (Open Loops PBS_CHAT_COST_040): one boolean per check was
// ~200 output tokens a read, about a fifth of paid spend; an empty list is a few. Same checks, same prompt.
const CHAT_KEYS: readonly string[] = [...JUDGE_CHECKS, ...CHAT_CHECKS];
export const chatJudgeListSchema = { type: 'object', properties: { fails: { type: 'array', items: { type: 'string', enum: CHAT_KEYS } }, voice: { type: 'integer', minimum: 1, maximum: 5 } }, required: ['fails', 'voice'], additionalProperties: false };
const LIST_REPLY = '\nReply as {"fails": [...], "voice": n}: "fails" names each check above that is true, by its name, and is [] when every check is false.';
export const VOICE_PASS = 4; // QUALITY C09-C12: 4/5 or better

const q = (s: string) => s.slice(0, 2000).replace(/"""/g, '"');

export function judgeMessages(input: JudgeInput, list = false): Message[] {
  const verses = input.verses.length ? input.verses.map(v => `${v.ref}: ${q(v.text)}`).join('\n') : '(none)';
  // Earlier words are context only (a woman she named, the topic): the newest 600 characters.
  const earlier = input.earlier?.trim() ? `Earlier in this chat they wrote:\n"""\n${q(input.earlier.slice(-600))}\n"""\n` : '';
  return [
    { role: 'system', content: judgePrompt.replace('{RUBRIC}', voiceRubric[input.voice]) + (list ? LIST_REPLY : '') },
    { role: 'user', content: `${earlier}The question:\n"""\n${q(input.question)}\n"""\nThe answer:\n"""\n${q(input.text)}\n"""\nVerses printed under it:\n"""\n${verses}\n"""` },
  ];
}

/** Reads the judge's JSON (one boolean per check, a voice score). A voice score under 4 is a fail. */
export function judgeVerdict(data: unknown, keys: readonly string[] = JUDGE_CHECKS): JudgeVerdict {
  if (!data || typeof data !== 'object') return { verdict: 'down' };
  const d = data as Record<string, unknown>;
  if (!keys.every(k => typeof d[k] === 'boolean')) return { verdict: 'down' };
  const voice = typeof d.voice === 'number' && d.voice >= 1 && d.voice <= 5 ? Math.round(d.voice) : null;
  const which: string[] = keys.filter(k => d[k] === true);
  if (voice !== null && voice < VOICE_PASS) which.push('voice_low');
  return which.length ? { verdict: 'fail', which, voice } : { verdict: 'pass', voice };
}
/** The chat judge's reading: every shared check and every CHAT_CHECKS key must be answered. */
export function chatJudgeVerdict(data: unknown): JudgeVerdict {
  const d = data as { fails?: unknown } | null;
  if (!d || typeof d !== 'object' || !Array.isArray(d.fails)) return judgeVerdict(data, CHAT_KEYS);
  // The list form: a name that is not a check means the reply was not read as asked, so it is down.
  if (!d.fails.every(k => typeof k === 'string' && CHAT_KEYS.includes(k))) return { verdict: 'down' };
  return judgeVerdict({ ...Object.fromEntries(CHAT_KEYS.map(k => [k, (d.fails as string[]).includes(k)])), voice: (data as { voice?: unknown }).voice }, CHAT_KEYS);
}
