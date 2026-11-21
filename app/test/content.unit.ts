// The paid content the price screen sells, checked on the real files: stories, longer plans, declaration topics.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readdirSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { parseReference } from '../src/bible/core';
import { byTopic, dailyDeclaration, declarations, fitsAge, pastStories, shelf, storyFor, tellingFor, topics } from '../src/content';
import { buildContent } from '../src/content/build';
import { mindsetDeclarations, mindsetTopics, plans, topicNames } from '../src/screens/daily/content';
import { canUse, PAID_FEATURES } from '../src/gates';

const en = JSON.parse(readFileSync('src/i18n/en.json', 'utf8')) as Record<string, string>;
const es = JSON.parse(readFileSync('src/i18n/es.json', 'utf8')) as Record<string, string>;
const source = (name: 'kjv' | 'rv1909') => new Set(gunzipSync(readFileSync(`../content/bible/${name}_vpl.txt.gz`)).toString()
  .split('\n').map(line => line.match(/^(\S+ \d+:\d+) /)?.[1]).filter(Boolean) as string[]);

test('the app ships exactly the stories the content gate passed, in all three tellings', () => {
  for (const telling of ['plain', 'hush-harbor', 'mi-refugio'] as const) {
    const files = readdirSync(`../content/stories/${telling}`).filter(f => f.endsWith('.json'))
      .map(f => JSON.parse(readFileSync(`../content/stories/${telling}/${f}`, 'utf8')));
    const passed = files.filter(f => f.status === 'passed' && f.qa?.final?.verdict === 'pass').map(f => f.id).sort();
    assert.ok(passed.length >= 60, telling);
    assert.deepEqual(shelf(telling, 'adult').map(s => s.id).sort(), passed);
  }
  // A story the gate has not passed never reaches the app.
  const { library } = buildContent();
  assert.ok(library.stories.plain.every(story => story.blocks.every(block => block.type !== 'scripture' || !('verses' in block))));
});

test('Spanish readers get the Spanish tellings; Hush Harbor its own; everyone else the plain one', () => {
  assert.equal(tellingFor('es', 'psalm-nights'), 'mi-refugio');
  assert.equal(tellingFor('es', 'hush-harbor'), 'mi-refugio');
  assert.equal(tellingFor('en', 'hush-harbor'), 'hush-harbor');
  assert.equal(tellingFor('en', 'young-faith'), 'plain');
  assert.ok(shelf('mi-refugio', 'adult').every(story => story.lang === 'es'));
  assert.ok(shelf('hush-harbor', 'adult').some(story => story.blocks.some(block => block.type === 'call')));
  assert.ok(shelf('plain', 'adult').every(story => story.blocks.every(block => block.type !== 'call')));
});

test('every story scripture reference exists in its stored Bible', () => {
  const books = { KJV: source('kjv'), RV1909: source('rv1909') };
  for (const telling of ['plain', 'hush-harbor', 'mi-refugio'] as const) for (const story of shelf(telling, 'adult')) {
    for (const block of story.blocks) if (block.type === 'scripture') {
      const ref = parseReference(block.ref)!;
      for (let v = ref.verse!; v <= (ref.endVerse ?? ref.verse!); v++) assert.ok(books[block.translation].has(`${ref.book} ${ref.chapter}:${v}`), `${story.id} ${block.ref}`);
    }
  }
});

test('age bands follow QUALITY.md S10 from the stories\' own tags', () => {
  const all = shelf('plain', 'adult');
  const child = shelf('plain', 'child');
  const teen = shelf('plain', 'teen');
  assert.ok(child.length < all.length && child.length > 30);
  assert.ok(child.every(s => s.violence !== 'strong' && s.sexual === 'none'));
  assert.ok(teen.every(s => s.violence !== 'strong'));
  assert.ok(all.some(s => !fitsAge(s, 'child')));
  assert.equal(shelf('plain', null).length, child.length);
});

test('today\'s story turns daily; the past stories are every other story on the shelf, newest first', () => {
  const list = shelf('hush-harbor', 'adult');
  const now = new Date(2026, 11, 3);
  const seen = new Set(Array.from({ length: list.length }, (_, d) => storyFor(list, new Date(2026, 11, 3 + d))!.id));
  assert.equal(seen.size, list.length);
  const past = pastStories(list, now);
  assert.equal(past[0].story.id, storyFor(list, new Date(2026, 11, 2))!.id);
  assert.equal(past[0].date.getDate(), 2);
  assert.ok(!past.some(item => item.story.id === storyFor(list, now)!.id));
  // Across a daylight-saving change the day still advances by exactly one.
  assert.notEqual(storyFor(list, new Date(2026, 2, 8, 23))!.id, storyFor(list, new Date(2026, 2, 9, 1))!.id);
});

test('reading plans: three free 7-day plans; every longer plan is paid, 30 days or more, every reading in KJV and RV1909', () => {
  const kjv = source('kjv');
  const rv = source('rv1909');
  const basic = plans.filter(plan => !plan.paid);
  const longer = plans.filter(plan => plan.paid);
  assert.equal(basic.length, 3);
  assert.ok(basic.every(plan => plan.readings.length === 7));
  assert.ok(longer.length >= 3);
  for (const plan of longer) {
    assert.ok(plan.readings.length >= 30, plan.id);
    assert.equal(new Set(plan.readings).size, plan.readings.length, `${plan.id} repeats a reading`);
    assert.ok(en[plan.title] && es[plan.title] && en[plan.detail!] && es[plan.detail!], plan.id);
  }
  for (const plan of plans) for (const reading of plan.readings) {
    const ref = parseReference(reading);
    assert.ok(ref, reading);
    const first = `${ref.book} ${ref.chapter}:${ref.verse ?? 1}`;
    const last = ref.endVerse ? `${ref.book} ${ref.chapter}:${ref.endVerse}` : first;
    for (const key of [first, last]) assert.ok(kjv.has(key) && rv.has(key), `${plan.id}: ${reading}`);
  }
  assert.ok(PAID_FEATURES.includes('longPlans'));
  assert.equal(canUse('longPlans', { paid: false, age: 'adult' }), false);
  assert.equal(canUse('longPlans', { paid: true, age: 'adult' }), true);
});

test('declaration topics: every Morning Word line has one topic, the same in English and Spanish, and each topic has lines', () => {
  const ids = (lang: 'en' | 'es') => declarations(lang).map(d => `${d.id}:${d.topic}`);
  assert.equal(declarations('en').length, 365);
  assert.deepEqual(ids('es'), ids('en'));
  for (const topic of topics) {
    assert.ok(topic in topicNames, topic);
    assert.ok(byTopic('en', topic).length >= 10, topic);
    assert.ok(byTopic('es', topic).length >= 10, topic);
  }
  assert.deepEqual(new Set(declarations('en').map(d => d.topic)), new Set(topics));
  // A topic narrows the day's line to that topic; without one, the day of the year picks it.
  const day = new Date(2026, 4, 17);
  assert.equal(dailyDeclaration('en', day, 'grief').topic, 'grief');
  assert.equal(dailyDeclaration('en', day).day, 137);
  assert.notEqual(dailyDeclaration('en', day, 'grief').id, dailyDeclaration('en', new Date(2026, 4, 18), 'grief').id);
});

test('the Mindset door\'s declarations carry no scripture and cover every Mindset topic in both languages', () => {
  for (const topic of mindsetTopics) assert.ok(mindsetDeclarations.filter(d => d.topic === topic).length >= 5, topic);
  for (const { line } of mindsetDeclarations) {
    assert.ok(en[line] && es[line], line);
    assert.equal(parseReference(en[line]), null);
    assert.ok(!/\b(God|Lord|Jesus|Dios|Señor|Jesús)\b/.test(`${en[line]} ${es[line]}`), line);
  }
  assert.ok(mindsetTopics.every(topic => !(topics as string[]).includes(topic)));
});
