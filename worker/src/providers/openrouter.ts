import { httpJson, parseJson, RungError, type Rung } from './types';
// OpenRouter :free models only (the model list is in wrangler vars; OpenRouter tries them in order).
export function openRouter(apiKey: string | undefined, models: string[]): Rung {
  return async (messages, schema, maxTokens) => {
    if (!apiKey) throw new RungError('missing_key', 'OPENROUTER_KEY_MISSING');
    const free = models.filter(m => m.endsWith(':free'));
    if (!free.length) throw new RungError('failed', 'OPENROUTER_NO_FREE_MODEL_CONFIGURED');
    const data = await httpJson('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: free[0], models: free, messages, max_tokens: maxTokens, temperature: 0.6,
        response_format: { type: 'json_schema', json_schema: { name: 'reply', strict: true, schema } } }),
    }) as { choices?: Array<{ message?: { content?: unknown } }> };
    return parseJson(data.choices?.[0]?.message?.content);
  };
}
