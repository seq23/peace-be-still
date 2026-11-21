import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { PAID_CHAT_MESSAGES } from '../src/gates';

// Every place paid chat is described to people says the fair-use number the worker enforces
// (PAID_CHAT_MESSAGES) and the monthly heavy-use pause (CHAT_USER_MONTHLY_USD_*), in EN and ES.
const root = new URL('../../', import.meta.url);
const read = (f: string) => readFileSync(new URL(f, root), 'utf8');
const EN = 'Very heavy use across a month may be paused until the next month.';
const ES = 'Un uso muy intenso durante un mes puede pausarse hasta el mes siguiente.';
const described: Array<[string, 'en' | 'es']> = [ // the language each file is mainly in
  ['legal/terms.md', 'en'], ['legal/es/terminos.md', 'es'], ['store/listing-en.md', 'en'], ['store/listing-es.md', 'es'],
  ['site/content/questions.mjs', 'en'], ['site/content/blitz-black.mjs', 'en'], ['site/content/blitz-apps.mjs', 'en'],
  ['site/public/index.html', 'en'], ['site/public/es/index.html', 'es'], ['site/public/terms.html', 'en'], ['site/public/es/terminos.html', 'es'],
];
const counted = [...described.map(([f]) => f), 'legal/privacy.md', 'legal/es/privacidad.md', 'site/public/privacy.html', 'site/public/es/privacidad.html', 'site/public/free-bible-chat/index.html', 'site/public/es/chat-biblico-gratis/index.html', 'site/public/black-bible-chat/index.html', 'site/public/black-bible-app/index.html', 'site/public/bible-app-for-women/index.html'];

test('every paid-chat number in the copy is the enforced fair-use setting, and nothing says unlimited', () => {
  for (const f of counted) {
    const text = read(f);
    const numbers = [...text.matchAll(/(\d+) (?:chat messages a day|mensajes de chat al día)/g)].map(m => Number(m[1]));
    assert.ok(numbers.length > 0, `${f} names no paid chat limit`);
    assert.deepEqual([...new Set(numbers)], [PAID_CHAT_MESSAGES], f);
    assert.doesNotMatch(text, /unlimited chat|chat sin límite|fair use(?: of)?:? \d+|uso (?:justo|razonable)(?: de)?:? \d+/i, f);
  }
});

test('where paid chat is described, the heavy-use pause is said plainly right after the daily number', () => {
  for (const [f] of described) {
    const text = read(f);
    const daily = [...text.matchAll(/(?:[Uu]p to|[Hh]asta) \d+ (?:chat messages a day|mensajes de chat al día)/g)];
    assert.ok(daily.length > 0, f);
    for (const m of daily) assert.ok(text.slice(m.index!, m.index! + 400).includes(/^[Hh]asta/.test(m[0]) ? ES : EN), `${f}: no heavy-use line after "${m[0]}"`);
  }
  const en = JSON.parse(read('app/src/i18n/en.json'))['paid.fairUse'], es = JSON.parse(read('app/src/i18n/es.json'))['paid.fairUse'];
  assert.equal(en, `Up to %{count} chat messages a day. ${EN}`);
  assert.equal(es, `Hasta %{count} mensajes de chat al día. ${ES}`);
});
