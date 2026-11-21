import { httpJson, parseJson, RungError, type Rung } from './types';
// OpenRouter :free models only. The key has the 1,000 free requests a day and a $0 spend limit;
// on top of that, code refuses any model id without ":free" and asks OpenRouter for a $0 price
// cap, so a paid model can never run. Free models are rate-limited upstream one by one, so a 429
// on one model moves to the next (rotation); only "free-models-per-day" means out for today.
export function openRouter(apiKey: string | undefined, models: string[]): Rung {
  const free = models.map(m => m.trim()).filter(m => m.endsWith(':free'));
  return async (messages, schema, maxTokens) => {
    if (!apiKey) throw new RungError('missing_key', 'OPENROUTER_KEY_MISSING');
    if (!free.length) throw new RungError('missing_key', 'OPENROUTER_NO_FREE_MODEL_CONFIGURED');
    let last: unknown = new RungError('failed', 'OPENROUTER_NO_MODEL_ANSWERED');
    for (const model of free) {
      try {
        const data = await httpJson('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7,
            provider: { max_price: { prompt: 0, completion: 0, request: 0 } },
            response_format: { type: 'json_schema', json_schema: { name: 'reply', strict: true, schema } } }),
        }, { retries: 1, daily: /free-models-per-day|per day/i }) as { model?: string; choices?: Array<{ message?: { content?: unknown } }> };
        // OpenRouter names the model that answered ("google/gemma-4-26b-a4b-it:free"): anything else is refused.
        if (typeof data.model === 'string' && !data.model.endsWith(':free')) throw new RungError('failed', 'OPENROUTER_NOT_FREE');
        return parseJson(data.choices?.[0]?.message?.content);
      } catch (error) {
        if (error instanceof RungError && error.kind === 'exhausted') throw error;
        last = error;
      }
    }
    throw last;
  };
}

/**
 * A PRIVATE paid route through OpenRouter (paid lane research, 21 Nov 2026): one model, served only
 * by the named US hosts, only with zero data retention and no data collection, never a fallback to
 * another host. Never DeepSeek's own API (its data is stored in China): the host list decides.
 */
export function openRouterPrivate(apiKey: string | undefined, model: string, hosts: string[]): Rung {
  return async (messages, schema, maxTokens, onUsage) => {
    if (!apiKey) throw new RungError('missing_key', 'OPENROUTER_KEY_MISSING');
    if (!hosts.length) throw new RungError('missing_key', 'OPENROUTER_PRIVATE_HOSTS_MISSING');
    const data = await httpJson('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.7,
        provider: { zdr: true, data_collection: 'deny', only: hosts, allow_fallbacks: false },
        // Thinking off (run 10b root cause: with effort low, DeepSeek V4.1 spent all 350 tokens reasoning and sent no content).
        reasoning: { enabled: false },
        response_format: { type: 'json_schema', json_schema: { name: 'reply', strict: true, schema } } }),
    }, { retries: 1 }) as { choices?: Array<{ message?: { content?: unknown } }>; usage?: { prompt_tokens?: number; completion_tokens?: number; completion_tokens_details?: { reasoning_tokens?: number }; prompt_tokens_details?: { cached_tokens?: number } } };
    const u = data.usage;
    if (u && onUsage) { const think = u.completion_tokens_details?.reasoning_tokens ?? 0; onUsage({ in: u.prompt_tokens ?? 0, out: Math.max(0, (u.completion_tokens ?? 0) - think), think, cached: u.prompt_tokens_details?.cached_tokens ?? 0 }); }
    return parseJson(data.choices?.[0]?.message?.content);
  };
}
