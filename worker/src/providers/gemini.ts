import { httpJson, parseJson, RungError, type Rung } from './types';
// Gemini free tier on the Peace Be Still-only AI Studio project (PBS_GEMINI_API_KEY).
// Its free tier may not serve people in the EEA, UK or Switzerland; index.ts blocks those first.
export function gemini(apiKey: string | undefined, model: string): Rung {
  return async (messages, schema, maxTokens) => {
    if (!apiKey) throw new RungError('missing_key', 'PBS_GEMINI_API_KEY_MISSING');
    const system = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
    const contents = messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
    const data = await httpJson(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, maxOutputTokens: maxTokens, temperature: 0.6 } }),
    }) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return parseJson(data.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join(''));
  };
}
