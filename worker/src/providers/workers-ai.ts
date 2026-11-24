import { backoff, CHAT_TIMEOUT_MS, parseJson, RungError, sleep, type Rung } from './types';
// Workers AI on the account's free 10,000 neurons a day. "Daily free allocation" (error 4006) is
// the only error that means out for today; capacity errors and blips are retried once.
// thinking: false turns a reasoning model's thinking off for chat answers (run 10: GLM 4.7 spent the whole
// 350-token budget thinking and returned no content on 65 of 65 calls; DeepSeek V4.1 truncated 57 of 87).
// chat_template_kwargs is accepted by every chat model tried (GLM, Qwen, Llama); DeepSeek takes reasoning_effort.
const noThinking = (model: string) => ({ chat_template_kwargs: { enable_thinking: false }, ...(/deepseek/i.test(model) ? { reasoning_effort: 'none' } : {}) });
export function workersAi(ai: Ai, model: string, opts: { temperature?: number; thinking?: boolean } = {}): Rung {
  return async (messages, schema, maxTokens, onUsage, timeoutMs) => {
    let last: RungError = new RungError('failed', 'WORKERS_AI_ERROR');
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt) await sleep(backoff.ms(attempt));
      let out: { response?: unknown; choices?: Array<{ message?: { content?: unknown } }>; usage?: { prompt_tokens?: number; completion_tokens?: number; prompt_tokens_details?: { cached_tokens?: number } } };
      try {
        // The binding has no timeout of its own: a hung call ends here like the HTTP providers' (one try's limit), not retried.
        let timer: ReturnType<typeof setTimeout> | null = null;
        const hung = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new RungError('failed', 'WORKERS_AI_TIMEOUT')), timeoutMs ?? CHAT_TIMEOUT_MS); });
        try {
          out = (await Promise.race([ai.run(model as keyof AiModels, { messages, response_format: { type: 'json_schema', json_schema: schema }, max_tokens: maxTokens, ...(opts.temperature === undefined ? {} : { temperature: opts.temperature }), ...(opts.thinking === false ? noThinking(model) : {}) } as never), hung])) as typeof out;
        } finally { clearTimeout(timer); }
      } catch (error) {
        if (error instanceof RungError && error.message === 'WORKERS_AI_TIMEOUT') throw error;
        const s = String(error);
        if (/4006|daily free allocation|neurons/i.test(s)) throw new RungError('exhausted', 'WORKERS_AI_DAILY');
        last = new RungError(/429|3040|capacity|rate/i.test(s) ? 'rate_limited' : 'failed', 'WORKERS_AI_ERROR');
        continue;
      }
      if (out?.usage && onUsage) onUsage({ in: out.usage.prompt_tokens ?? 0, out: out.usage.completion_tokens ?? 0, think: 0, cached: out.usage.prompt_tokens_details?.cached_tokens ?? 0 });
      // Newer chat models (gpt-oss, GLM, DeepSeek) answer in the chat-completions shape.
      return parseJson(out?.response ?? out?.choices?.[0]?.message?.content);
    }
    throw last;
  };
}
