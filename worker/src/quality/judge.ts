// The second layer for the C06/C07 red lines: one cheap free-model read of meaning after the
// code floor passes. It flags; it never approves on its own. Down = the code floor stands alone.
import { judgePrompt } from '../prompts';

export type JudgeVerdict = { verdict: 'pass' } | { verdict: 'fail'; which: string[] } | { verdict: 'down' };
const schema = { type: 'object', properties: { fail: { type: 'boolean' }, which: { type: 'array', items: { type: 'string' } } }, required: ['fail', 'which'] };

export async function judgeAnswer(ai: Ai, model: string, text: string): Promise<JudgeVerdict> {
  try {
    const out = (await ai.run(model as keyof AiModels, {
      messages: [{ role: 'system', content: judgePrompt }, { role: 'user', content: `Answer to check:\n"""\n${text}\n"""` }],
      response_format: { type: 'json_schema', json_schema: schema },
      max_tokens: 60,
    } as never)) as { response?: unknown };
    const r = typeof out?.response === 'string' ? JSON.parse(out.response) : out?.response;
    if (!r || typeof r !== 'object' || typeof (r as { fail?: unknown }).fail !== 'boolean') return { verdict: 'down' };
    const v = r as { fail: boolean; which?: unknown };
    const which = Array.isArray(v.which) ? v.which.map(String).slice(0, 9) : [];
    return v.fail && which.length ? { verdict: 'fail', which } : { verdict: 'pass' };
  } catch {
    return { verdict: 'down' };
  }
}
