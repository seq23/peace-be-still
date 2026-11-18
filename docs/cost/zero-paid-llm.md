# Zero paid LLM — peace-be-still

Owner policy: nothing paid. The website makes no model calls. The only model use is the shared search-loop engine drafting question pages.

| Call site | What it does | Models | Guard |
|---|---|---|---|
| Search Loop (`.github/workflows/search-loop.yml`, engine `seq23/search-loop`) | Drafts question pages | the `:free` OpenRouter models in `config/llm_routing.json`, then the engine's other $0 lanes (Gemini no-billing project, Workers AI inside its free daily allowance) when their secrets are set | the engine fails closed on any unknown or non-zero cost (`max_cost_usd: 0`, no paid fallback) |

To refresh the model list, fetch `https://openrouter.ai/api/v1/models` (no key), keep models whose prompt and completion prices are `"0"`, and update `models` and `pricing_snapshot.date`.
