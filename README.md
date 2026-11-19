# Peace Be Still

*A great calm, every night.* A Spry Labs phone app with two doors, God's Word and Mindset. Coming soon to the App Store and Google Play.

This repo holds:

- `site/`: the website at https://peacebestillapp.com (English at `/`, Spanish at `/es/`). Plain HTML and CSS served by a Cloudflare Worker with static assets (`site/src/worker.js` only redirects www to the bare domain and adds security headers).
- `search-loop.config.json` and `.github/workflows/search-loop.yml`: the shared search engine (seq23/search-loop) adds faith and sleep question pages under `/questions/`, each ending in the launch waitlist.
- `.github/workflows/threads-posts.yml`: the daily Threads post on @peacebestillapp at 9:30 PM CT through the ApprovalPrep Buffer (secret `BUFFER_APPROVALPREP_ACCESS_TOKEN`), from the 60-post bank `data/threads/posts.json`, 7 evenings queued ahead, recycling after 60+ days; ledger `data/threads/posted.json`. Logic and stops: `scripts/threads/threads_loop.mjs`.
- The app (Expo) arrives in phase 1.

## Website

- **Deploy:** every push to `main` that touches `site/` runs `.github/workflows/site.yml`: the safety check, then `wrangler deploy` from `site/`, then a smoke test of the live pages and the www redirect. Never deploy by hand.
- **Check locally:** `node site/scripts/check-site.mjs && node --test site/test/*.test.mjs`. Preview: `cd site && npx wrangler@4.76.0 dev`.
- **Pages:** seed question pages live in `site/content/questions.mjs` (the 18 Nov 2026 search pages in `site/content/blitz-*.mjs`; scripture only via `site/content/scripture.mjs`); the header, footer and waitlist parts in `site/content/parts.mjs`. After editing either, run `node site/scripts/build-seed-pages.mjs && node site/scripts/build-sitemap.mjs`.
- **Waitlist:** the form posts to `/api/waitlist` (`site/src/worker.js`) and stores a row in the D1 database `peace-be-still`, table `waitlist` (`site/migrations/`). It never sends email. The only use is one launch email, after which the list is deleted (see `/privacy`).
- **Secrets:** `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are GitHub repo secrets. Nothing secret lives in this repo.
- **Images:** `site/assets-src/` holds the HTML used to render `og.png`, `og-es.png` and the PNG icons with headless Chrome.
- **Fonts:** Libre Caslon Text, Figtree and Spline Sans Mono, self-hosted from Google Fonts under the SIL Open Font License 1.1.

## Validators

| Check | Protects | Runs |
|---|---|---|
| `site/scripts/check-site.mjs` (+ `--self-test`) | No "Black Bible Stories" (registered mark) or "Speak Life"; no outcome/health or manifesting words; mindset-practice words only on Mindset pages and no links between the two doors; the only form is the waitlist, no email addresses or third-party scripts (the `/privacy` promise); no store badges or links before launch | every PR, before every deploy, and after every search-loop build |
| `site/test/scripture.test.mjs` | Every verse on every page equals the stored KJV / Reina-Valera 1909 text (`content/bible/`); a verse block with no stored reference fails. Pages quote scripture only through `site/content/scripture.mjs` | every PR and before every deploy |
| `scripts/threads/validate.mjs` | Threads posts: every verse word for word (KJV / RV1909) at queue time, faith only (no Mindset, Imagination Nights, manifesting, law of assumption), "coming soon" until `site/config/store.json` has the App Store link, only ever the @peacebestillapp channel, the loop's named stops | every PR touching the Threads files, and inside every daily run |
| `site/test/waitlist.test.mjs` | The waitlist endpoint: honeypot, per-IP limit (429), daily ceiling (503), consent required, same-origin only, remove link deletes the row, www redirect | every PR and before every deploy |

Design: see [DESIGN.md](DESIGN.md).
