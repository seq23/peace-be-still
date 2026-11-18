# peace-be-still

Read first: `README.md` (how the site is built and deployed) and `DESIGN.md` (the approved brand).

- **Nothing paid.** No paid API, no paid model, no paid service; see `docs/cost/zero-paid-llm.md`.
- Scripture is quoted word for word: KJV in English, Reina-Valera 1909 in Spanish, always with book, chapter and verse.
- Never the phrase "Black Bible Stories" (registered mark; say "Bible Stories with Black Faces"), never "Speak Life", never "manifest", no outcome or health promises, no launch date.
- The God's Word door and the Mindset door never link each other (`site/scripts/check-site.mjs` enforces it).
- The waitlist never sends email; its only use is one launch email, then the list is deleted.
- Work in your own worktree; run `node site/scripts/check-site.mjs && node --test site/test/*.test.mjs` before pushing.
