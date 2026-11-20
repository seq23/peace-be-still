import { parseJson, RungError, type Rung } from './types';
export function workersAi(ai: Ai, model: string): Rung {
  return async (messages, schema, maxTokens) => {
    let out: { response?: unknown };
    try {
      out = (await ai.run(model as keyof AiModels, { messages, response_format: { type: 'json_schema', json_schema: schema }, max_tokens: maxTokens } as never)) as { response?: unknown };
    } catch (error) {
      throw new RungError(/429|capacity|limit|neuron/i.test(String(error)) ? 'rate_limited' : 'failed', 'WORKERS_AI_ERROR');
    }
    return parseJson(out?.response);
  };
}
