# peace-be-still

Read first: `README.md` (how the site is built and deployed) and `DESIGN.md` (the approved brand).

- **Paid AI only on the paid chat lane, capped** (owner ruling 21 Nov 2026): paid chat and the crisis lane use the billed key (`PBS_GEMINI_API_KEY` or the private route in `PAID_PROVIDER`), capped at $100 a month app-wide (`PAID_AI_MONTHLY_CAP_USD`); the free lane never reads the billed key; everything else (the website, search-loop drafting) stays $0. See `docs/cost/zero-paid-llm.md` and `docs/OPERATIONS.md`.
- Scripture is quoted word for word: KJV in English, Reina-Valera 1909 in Spanish, always with book, chapter and verse.
- Never the phrase "Black Bible Stories" (registered mark; say "Bible Stories with Black Faces"), never "Speak Life", never "manifest", no outcome or health promises, no launch date.
- The God's Word door and the Mindset door never link each other (`site/scripts/check-site.mjs` enforces it).
- The waitlist never sends email; its only use is one launch email, then the list is deleted.
- Work in your own worktree; run `node site/scripts/check-site.mjs && node --test site/test/*.test.mjs` before pushing.
