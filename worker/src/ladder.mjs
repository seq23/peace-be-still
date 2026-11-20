// Providers are tried in the declared order. A malformed response is a failed rung,
// not an answer to show a listener. Never include user text in errors or logs.
export async function runLadder(providers, request) {
  for (const provider of providers) {
    try {
      const answer = await provider(request);
      if (answer && typeof answer.text === 'string' && answer.text.trim() &&
          Array.isArray(answer.references) && answer.references.every(ref => typeof ref === 'string')) {
        return { ok: true, answer };
      }
    } catch {
      // An unavailable or exhausted free provider must not prevent the next attempt.
    }
  }
  return { ok: false, code: 'CHAT_NO_FREE_MODEL' };
}
