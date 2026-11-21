# Operations: the chat Worker

What an operator can do and what the Worker reports. The code is in `worker/src` (controls in `controls.ts`, crisis in `crisis.ts`).

## Pause one account's chat (kill switch)

`POST /api/admin/chat-block` with `Authorization: Bearer $CHAT_ADMIN_TOKEN` and `{"installId": "...", "reason": "short-code", "hours": 72}` (leave out `hours` to pause until lifted). `DELETE` with `{"installId": "..."}` lifts it. That person sees "Chat is paused on this account" and the support link. With no `CHAT_ADMIN_TOKEN` the route answers `CHAT_ADMIN_TOKEN_MISSING` (503).

## Spend

`GET /api/admin/spend` (same token): the paid-route spend this calendar month (Central), the cap (`PAID_AI_MONTHLY_CAP_USD`, $100) and which alerts fired.

## Named stops and alerts (log codes, no chat text)

| Code | Means | What happens |
| --- | --- | --- |
| `CHAT_PAID_CAP_80` | Paid AI spend reached 80% of the month's cap | Alert once a month; chat goes on |
| `NAMED STOP CHAT_PAID_MONTHLY_CAP` | Paid AI spend reached the cap | Paid chat shows the fair-use pause until the 1st; crisis messages still get the card (and paid users the crisis model) |
| `CHAT_SAFETY_CAP_80` / `NAMED STOP CHAT_SAFETY_MONTHLY_CAP` | The safety model's month (`SAFETY_MONTHLY_CAP_USD`, $10) at 80% / used up | Past it the safety model is skipped; intent phrases, the answer model's risk tag and the crisis model's instructions carry on |
| `CHAT_USER_CEILING` | One paid account passed its hidden monthly AI backstop (`CHAT_USER_MONTHLY_USD_YEARLY` $1.33, raise to $1.83 once enrolled in Apple's Small Business Program; `CHAT_USER_MONTHLY_USD_MONTHLY` $5; both in worker/wrangler.jsonc, no app update) | Same as after her 100 private messages a day (`PAID_CHAT_MESSAGES`, app/src/gates/index.ts): she is asked once a day whether to keep chatting on free chat (not private); her message is kept and sent on the lane she picks. If the free lane has nothing, the private model answers briefly (`overflow_short`). A paid user never sees a pause; crisis stays on the private crisis model |
| `CHAT_ABUSE_SLOW` / `CHAT_ABUSE_PAUSE` | Floods, repeated messages or jailbreak spam | Slowed, then paused 24 hours |
| `CHAT_PAID_DOWN` | The paid model gave nothing | "Paid chat is down for a moment"; never a free model |
| `CHAT_CRISIS_MODEL_DOWN` | The crisis model gave nothing on a high signal | The card and the fixed check-in still show |
| `CHAT_NO_FREE_MODEL` | Every free allowance is used up today | "Free chat is resting" |

## Lanes and models (env, `worker/wrangler.jsonc`)

- Free: `providers.mjs` order (Workers AI, Gemini free on `PBS_FREE_GEMINI_API_KEY`, OpenRouter free). Needs the person's consent (`freeConsent`).
- Paid: `PAID_PROVIDER` + `PAID_MODEL` on the billed key `PBS_GEMINI_API_KEY` (or Workers AI, or OpenRouter with zero data retention). Never falls back to free.
- Crisis: `CRISIS_MODEL` on the billed key, for any conversation the safety check flags; it decays after 10 calm turns or 24 hours.
