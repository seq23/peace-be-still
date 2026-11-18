# Peace Be Still

*A great calm, every night.* A Spry Labs phone app with two doors, God's Word and Mindset. Coming soon to the App Store and Google Play.

This repo holds:

- `site/`: the website at https://peacebestillapp.com (English at `/`, Spanish at `/es/`). Plain HTML and CSS served by a Cloudflare Worker with static assets (`site/src/worker.js` only redirects www to the bare domain and adds security headers).
- The app (Expo) arrives in phase 1.

## Website

- **Deploy:** every push to `main` that touches `site/` runs `.github/workflows/site.yml`: the safety check, then `wrangler deploy` from `site/`, then a smoke test of the live pages and the www redirect. Never deploy by hand.
- **Check locally:** `node site/scripts/check-site.mjs` (the only validator; it guards trademarks, claims, and the "collects no data" promise on `/privacy`). Preview: `cd site && npx wrangler@4.76.0 dev`.
- **Secrets:** `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are GitHub repo secrets. Nothing secret lives in this repo.
- **Images:** `site/assets-src/` holds the HTML used to render `og.png`, `og-es.png` and the PNG icons with headless Chrome.
- **Fonts:** Libre Caslon Text, Figtree and Spline Sans Mono, self-hosted from Google Fonts under the SIL Open Font License 1.1.

## Validators

| Check | Protects | Runs |
|---|---|---|
| `site/scripts/check-site.mjs` | No "Black Bible Stories" (registered mark) or "Speak Life"; no outcome/health or manifesting words; no forms, email addresses or third-party scripts while `/privacy` says nothing is collected; no store badges or links before launch | every PR and before every deploy |

Design: see [DESIGN.md](DESIGN.md).
