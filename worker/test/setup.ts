import { applyD1Migrations, env } from 'cloudflare:test';
import { beforeEach } from 'vitest';
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
const insert = env.DB.prepare('INSERT OR IGNORE INTO bible_verses (translation, book, chapter, verse, text) VALUES (?, ?, ?, ?, ?)');
const all = [...env.TEST_VERSES, ...env.TEST_SAMPLE, ...env.TEST_PSALM_HEADS];
for (let i = 0; i < all.length; i += 200) await env.DB.batch(all.slice(i, i + 200).map(r => insert.bind(...r)));
// Every test starts with no earlier answers (quality/variety.ts compares a draft with the last
// answers anyone got): tests that reuse one canned reply stay about their own behaviour, and the
// variety tests seed what they compare against.
beforeEach(async () => { await env.DB.exec('DELETE FROM answer_shape'); });
