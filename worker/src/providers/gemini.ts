import { httpJson, parseJson, RungError, type Rung } from './types';
// Gemini on a Peace Be Still-only AI Studio project. The free lane uses the free-tier project
// (PBS_GEMINI_API_KEY; Google may use and review what is sent), the paid lane a billed project
// (PBS_GEMINI_PAID_API_KEY; private). One rung per model id. Its free tier may not serve people in
// the EEA, UK or Switzerland; index.ts blocks those first. Thinking is held at GEMINI_THINKING_LEVEL
// (minimal: these answers are short and thinking is billed as output); token counts are reported.
// Thinking off for normal chat: 2.5 models take a budget (0 is off); 3.x take a level (minimal is the lowest).
// Gemini caches a repeated prompt prefix by itself (implicit caching), so the fixed system prompt goes first.
function thinking(model: string, level: string | undefined) {
  if (/^gemini-2\.5/.test(model)) return { thinkingConfig: { thinkingBudget: 0 } };
  return level ? { thinkingConfig: { thinkingLevel: level } } : {};
}
export function gemini(apiKey: string | undefined, model: string, opts: { missing?: string; thinkingLevel?: string } = {}): Rung {
  return async (messages, schema, maxTokens, onUsage) => {
    if (!apiKey) throw new RungError('missing_key', opts.missing ?? 'PBS_GEMINI_API_KEY_MISSING');
    const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
    const contents = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const data = await httpJson(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, maxOutputTokens: maxTokens, temperature: 0.7, ...thinking(model, opts.thinkingLevel) } }),
    }, { retries: 2, daily: /PerDay/ }) as { candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>; usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number; cachedContentTokenCount?: number } };
    const u = data.usageMetadata;
    if (u && onUsage) onUsage({ in: u.promptTokenCount ?? 0, out: u.candidatesTokenCount ?? 0, think: u.thoughtsTokenCount ?? 0, cached: u.cachedContentTokenCount ?? 0 });
    if (data.candidates?.[0]?.finishReason === 'MAX_TOKENS') throw new RungError('cut_off', 'GEMINI_MAX_TOKENS');
    return parseJson(data.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join(''));
  };
}
