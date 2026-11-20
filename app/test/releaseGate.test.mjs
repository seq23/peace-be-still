import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const root = new URL('../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const paths = ['legal/privacy.md', 'legal/terms.md', 'legal/disclaimer.md', 'store/listing-en.md', 'store/listing-es.md', 'store/privacy-label.md', ...readdirSync(new URL('store/custom/', root)).filter((name) => name.endsWith('.md')).map((name) => `store/custom/${name}`)];
const banned = /\b(?:unlock|elevate|delve|seamless|empower|tailored|embark|ai-powered|your faith companion|dive in|black bible stories|speak life|urban|manifest(?:ing)?|law of attraction|neville)\b|[\p{Extended_Pictographic}]|sparkle|magic.wand/iu;
const violations = (text) => banned.test(text);

test('release content exists and passes the shared copy restrictions', () => {
  assert.equal(violations('A quiet place to read.'), false);
  assert.equal(violations('Unlock your evening'), true);
  assert.equal(violations('✨'), true);
  assert.ok(paths.length >= 10);
  for (const path of paths) {
    const content = read(path);
    assert.ok(content.trim().length > 100, `${path} is empty`);
    assert.equal(violations(content), false, `${path} contains restricted copy`);
  }
  assert.deepEqual(readdirSync(new URL('store/custom/', root)).sort(), ['hush-harbor.md', 'imagination-nights.md', 'mi-refugio.md', 'psalm-nights.md']);
  assert.doesNotMatch(read('store/custom/imagination-nights.md'), /hush harbor|psalm nights|mi refugio|bible|scripture|https?:/i);
});

test('subscription dry run only prints the intended plan', () => {
  const run = spawnSync(process.execPath, ['scripts/asc-dry-run.mjs'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const plan = JSON.parse(run.stdout);
  assert.equal(plan.mode, 'dry-run');
  assert.deepEqual(plan.products.map(({ duration, plannedUSPrice }) => [duration, plannedUSPrice]), [['1 month', '$7.99'], ['1 year', '$39.99']]);
  assert.equal(plan.introductoryOffer, 'none');
  assert.match(plan.action, /no products or prices are created or changed/i);
});
