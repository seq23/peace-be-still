// Tests run inside workerd (Miniflare) with a real local D1, so the admission triggers and
// their RAISE(ABORT) codes are proven on D1 itself. Verses come from the app's real Bible
// files (the same files scripts/worker-bible-load.mjs loads into production D1): the chapters
// the tests cite, plus 200 random verses per translation (seed logged; PBS_SEED replays it).
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const chapters: Array<[string, number]> = [['PSA', 46], ['PSA', 130], ['PSA', 34], ['PSA', 23], ['PSA', 91], ['PSA', 4], ['PSA', 151], ['ISA', 41], ['PHI', 4], ['JOH', 3], ['JOH', 11], ['JOH', 14], ['JOH', 15],
  ['MAT', 11], ['MAT', 6], ['MAT', 24], ['ROM', 8], ['ROM', 6], ['ROM', 10], ['1PE', 5], ['2SA', 13], ['2CO', 12], ['HEB', 13], ['1TI', 4], ['PRO', 3], ['ECC', 3], ['EPH', 2], ['1JO', 1],
  ['1CO', 12], ['2CO', 9], ['PSA', 37], ['PSA', 13], ['PSA', 55], ['MAT', 9], ['MAT', 22], ['ROM', 1], ['PRO', 22], ['PSA', 101], ['1TH', 4],
  ['1CO', 6], ['1CO', 7], ['SOL', 2], ['SOL', 8], ['LAM', 3], ['MAT', 5], ['MAT', 21]];
const seed = Number(process.env.PBS_SEED ?? Date.now() % 2147483647);
console.log(`worker tests: verse sample seed ${seed} (replay with PBS_SEED=${seed})`);

function verses() {
  const rows: Array<[string, string, number, number, string]> = [];
  const sample: Array<[string, string, number, number, string]> = [];
  const heads: Array<[string, string, number, number, string]> = [];
  let s = seed;
  const rand = () => (s = (s * 48271) % 2147483647) / 2147483647;
  for (const [translation, file] of [['KJV', 'kjv'], ['RV1909', 'rv1909']] as const) {
    const db = new DatabaseSync(here(`../app/src/bible/data/${file}.db`), { readOnly: true });
    const q = db.prepare('SELECT book, chapter, verse, text FROM verses WHERE book = ? AND chapter = ?');
    for (const [book, chapter] of chapters) for (const r of q.all(book, chapter) as Array<{ book: string; chapter: number; verse: number; text: string }>) rows.push([translation, r.book, r.chapter, r.verse, r.text]);
    const total = (db.prepare('SELECT max(id) AS n FROM verses').get() as { n: number }).n;
    const byId = db.prepare('SELECT book, chapter, verse, text FROM verses WHERE id = ?');
    for (let i = 0; i < 200; i++) { const r = byId.get(1 + Math.floor(rand() * total)) as { book: string; chapter: number; verse: number; text: string }; sample.push([translation, r.book, r.chapter, r.verse, r.text]); }
    // Verse 1 of every Psalm: the heading check runs over all 150 in both translations.
    for (const r of db.prepare("SELECT book, chapter, verse, text FROM verses WHERE book = 'PSA' AND verse = 1").all() as Array<{ book: string; chapter: number; verse: number; text: string }>) heads.push([translation, r.book, r.chapter, r.verse, r.text]);
    db.close();
  }
  return { rows, sample, heads };
}

export default defineConfig({
  // One tsconfig for everything bundled here, including the app modules the Worker imports
  // (the app's own tsconfig extends expo's, which this package does not install).
  tsconfig: './tsconfig.json',
  plugins: [
    cloudflareTest(async () => {
      const { rows, sample, heads } = verses();
      return {
        wrangler: { configPath: './wrangler.jsonc' },
        remoteBindings: false,
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: await readD1Migrations(here('./migrations')),
            TEST_VERSES: rows,
            TEST_SAMPLE: sample,
            TEST_PSALM_HEADS: heads,
            CHAT_TOKEN_SECRET: 'test-secret-test-secret-test-secret-0001',
            IP_HASH_SECRET: 'test-ip-secret-test-ip-secret-test-0002',
            CHAT_ADMIN_TOKEN: 'test-admin-token-0001',
            // Many tests share one IP and one day; the limits themselves are tested on D1 directly.
            CHAT_GLOBAL_MESSAGES_DAILY: '100000',
            CHAT_IP_MESSAGES_DAILY: '100000',
          },
        },
      };
    }),
  ],
  // Each test runs the real endpoint on workerd + D1; 30 s keeps a loaded runner from failing on time alone.
  test: { setupFiles: ['./test/setup.ts'], include: ['test/**/*.test.ts'], testTimeout: 30_000 },
});
