import { backoff, parseJson, RungError, sleep, type Rung } from './types';
// Workers AI on the account's free 10,000 neurons a day. "Daily free allocation" (error 4006) is
// the only error that means out for today; capacity errors and blips are retried once.
export function workersAi(ai: Ai, model: string, opts: { temperature?: number } = {}): Rung {
  return async (messages, schema, maxTokens, onUsage) => {
    let last: RungError = new RungError('failed', 'WORKERS_AI_ERROR');
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt) await sleep(backoff.ms(attempt));
      let out: { response?: unknown; choices?: Array<{ message?: { content?: unknown } }>; usage?: { prompt_tokens?: number; completion_tokens?: number } };
      try {
        out = (await ai.run(model as keyof AiModels, { messages, response_format: { type: 'json_schema', json_schema: schema }, max_tokens: maxTokens, ...(opts.temperature === undefined ? {} : { temperature: opts.temperature }) } as never)) as typeof out;
      } catch (error) {
        const s = String(error);
        if (/4006|daily free allocation|neurons/i.test(s)) throw new RungError('exhausted', 'WORKERS_AI_DAILY');
        last = new RungError(/429|3040|capacity|rate/i.test(s) ? 'rate_limited' : 'failed', 'WORKERS_AI_ERROR');
        continue;
      }
      if (out?.usage && onUsage) onUsage({ in: out.usage.prompt_tokens ?? 0, out: out.usage.completion_tokens ?? 0, think: 0 });
      // Newer chat models (gpt-oss, GLM, DeepSeek) answer in the chat-completions shape.
      return parseJson(out?.response ?? out?.choices?.[0]?.message?.content);
    }
    throw last;
  };
}
