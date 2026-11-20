import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import banned from '../src/quality/banned.json';
import products from '../src/config/products.json';
// @ts-expect-error shared JavaScript content rules
import { NEVER, MINDSET, FAITH_LINK } from '../../scripts/content/rules.mjs';
// @ts-expect-error shared provider registry
import { providers } from '../../worker/providers.mjs';

const read = (path: string) => readFileSync(`../${path}`, 'utf8');
const lines = (s: string) => s.split('\n').filter(Boolean);
const field = (s: string, name: string) => s.match(new RegExp(`^${name}: (.+)$`, 'm'))?.[1] ?? '';
const visible = (s: string) => lines(s).filter(x => !/^(Keywords(?: assigned)?|Deep link):/.test(x)).join('\n');
const ui = new RegExp(`\\b(?:${banned.ui.join('|')})\\b|[—!]|\\p{Extended_Pictographic}`, 'iu');
const hasUiViolation = (s: string) => ui.test(s.replaceAll('its own space', 'its own place'));
const keywordOk = (s: string, name: string, subtitle: string) => {
 const words = s.split(',');
 const title = new Set((name + ' ' + subtitle).toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu));
 return Buffer.byteLength(s) <= 100 && words.every(w => w.length > 2 && !/\s/.test(w) && !title.has(w.toLocaleLowerCase())) && new Set(words).size === words.length;
};
const disclosed = (text: string, names: string[]) => names.every(n => text.includes(n));

test('store copy respects door and visible-copy rules', () => {
 assert.ok(MINDSET.test('law of assumption')); assert.ok(FAITH_LINK.test('Fall asleep with God'));
 assert.ok(NEVER.test('Black Bible Stories')); assert.ok(hasUiViolation('A seamless night!'));
 assert.ok(!MINDSET.test('A quiet evening')); assert.ok(!FAITH_LINK.test('A quiet evening')); assert.ok(!NEVER.test('A quiet evening')); assert.ok(!hasUiViolation('A quiet evening'));
 const custom = readdirSync('../store/custom').filter(x => x.endsWith('.md'));
 assert.ok(custom.length > 0);
 for (const file of custom) {
  const content = read(`store/custom/${file}`);
  for (const key of ['Deep link', 'Keywords assigned', 'Promotional text', 'Screenshot 1', 'Screenshot 2', 'Screenshot 3']) assert.ok(field(content, key), `${file}: ${key}`);
  const text = visible(content);
  assert.doesNotMatch(text, NEVER, file); assert.equal(hasUiViolation(text), false, file);
  assert.doesNotMatch(text, file === 'imagination-nights.md' ? FAITH_LINK : MINDSET, file);
 }
 for (const file of ['listing-en.md', 'listing-es.md', 'privacy-label.md']) {
  const text = visible(read(`store/${file}`)); assert.doesNotMatch(text, NEVER, file); assert.equal(hasUiViolation(text), false, file);
 }
 for (const file of ['privacy.md','terms.md','disclaimer.md']) { const text = read(`legal/${file}`); assert.ok(text.length > 100); assert.doesNotMatch(text, NEVER); }
});

test('keyword assignments are valid and unique per locale', () => {
 assert.ok(keywordOk('bible,prayer', 'Peace Be Still', 'Whispered sleep'));
 assert.ok(!keywordOk('bible, prayer', 'Peace Be Still', 'Whispered sleep'));
 assert.ok(!keywordOk('bible,bible', 'Peace Be Still', 'Whispered sleep'));
 assert.ok(!keywordOk('sleep', 'Peace Be Still', 'Whispered sleep'));
 assert.ok(!keywordOk('x'.repeat(101), 'Peace Be Still', 'Whispered sleep'));
 for (const lang of ['en','es']) {
  const listing = read(`store/listing-${lang}.md`), words = field(listing, 'Keywords');
  assert.ok(keywordOk(words, field(listing, 'Name'), field(listing, 'Subtitle')));
  const assigned = lang === 'en' ? ['hush-harbor','psalm-nights','imagination-nights'] : ['mi-refugio'];
  const used = assigned.flatMap(page => field(read(`store/custom/${page}.md`), 'Keywords assigned').split(','));
  assert.equal(new Set(used).size, used.length); for (const word of used) assert.ok(words.split(',').includes(word), word);
 }
});

test('privacy discloses every configured AI provider', () => {
 assert.ok(disclosed('one two', ['one','two'])); assert.ok(!disclosed('one', ['one','two']));
 assert.ok(providers.length > 0); assert.ok(disclosed(read('legal/privacy.md'), providers));
});

test('dry run prints the intended product plan without imports', () => {
 assert.doesNotMatch(read('scripts/asc-dry-run.mjs'), /^\s*(?:import|export\s+.*from|(?:const|let|var).*require\s*\()/m);
 const run = spawnSync(process.execPath, ['../scripts/asc-dry-run.mjs'], { encoding: 'utf8' });
 assert.equal(run.status, 0, run.stderr); const plan = JSON.parse(run.stdout);
 assert.deepEqual(plan.products.map((p: {id: string}) => p.id), [products.monthly, products.yearly]);
 assert.equal(plan.introductoryOffer, 'none'); assert.equal(plan.entitlement, 'paid');
});

// Store assets that quote scripture carry a reference and translation on the same line.
test('scripture quotations match the stored text', async () => {
 // @ts-expect-error shared scripture lookup
 const { verses } = await import('../../scripts/content/lib.mjs');
 const valid = (ref: string, translation: string, quote: string) => verses(ref, translation).some((v: {text: string}) => v.text === quote);
 const exact = verses('MAR 4:39', 'KJV')[0].text;
 assert.ok(valid('MAR 4:39', 'KJV', exact));
 assert.ok(!valid('MAR 4:39', 'KJV', exact.replace('Peace', 'Silence')));
 for (const file of readdirSync('../store/custom').filter(x => x.endsWith('.md'))) {
  for (const line of lines(read(`store/custom/${file}`)).filter(x => x.startsWith('Scripture quote:'))) {
   const match = line.match(/^Scripture quote: ([A-Z0-9]{3} \d+:\d+) \| (KJV|RV1909) \| (.+)$/);
   assert.ok(match, `${file}: malformed scripture quotation`);
   assert.ok(valid(match[1], match[2], match[3]), `${file}: scripture differs from stored text`);
  }
 }
});
