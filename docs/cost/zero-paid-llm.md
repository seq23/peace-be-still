# Zero paid LLM — peace-be-still

Owner policy: nothing paid. The website makes no model calls. Model use: the shared search-loop engine drafting question pages, and the content gate's verse read.

| Call site | What it does | Models | Guard |
|---|---|---|---|
| Search Loop (`.github/workflows/search-loop.yml`, engine `seq23/search-loop`) | Drafts question pages | the `:free` OpenRouter models in `config/llm_routing.json`, then the engine's other $0 lanes (Gemini no-billing project, Workers AI inside its free daily allowance) when their secrets are set | the engine fails closed on any unknown or non-zero cost (`max_cost_usd: 0`, no paid fallback) |
| Verse read (`scripts/content/verse-read.mjs`, run by hand inside the vault) | Reads each Imagination Night for Bible wording in any translation; the verdict is recorded in `content/src/reviews/verse-read.tsv`, so CI makes no call | `draft.mjs` `GEMINI_TEXT_MODELS` on the app's own free Gemini project (`PBS_GEMINI_API_KEY`) | the route stops `NOT_FREE_TIER` on a billed key; no read = the night is held, never passed |

To refresh the model list, fetch `https://openrouter.ai/api/v1/models` (no key), keep models whose prompt and completion prices are `"0"`, and update `models` and `pricing_snapshot.date`.
