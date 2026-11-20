import { applyD1Migrations, env } from 'cloudflare:test';
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
const insert = env.DB.prepare('INSERT OR IGNORE INTO bible_verses (translation, book, chapter, verse, text) VALUES (?, ?, ?, ?, ?)');
const all = [...env.TEST_VERSES, ...env.TEST_SAMPLE];
for (let i = 0; i < all.length; i += 200) await env.DB.batch(all.slice(i, i + 200).map(r => insert.bind(...r)));
