import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { PAID_CHAT_MESSAGES } from '../src/gates';

// Every place paid chat is described to people says the fair-use number the worker enforces
// (PAID_CHAT_MESSAGES) and the monthly heavy-use pause (CHAT_USER_MONTHLY_USD_*), in EN and ES.
const root = new URL('../../', import.meta.url);
const read = (f: string) => readFileSync(new URL(f, root), 'utf8');
// The copy source is the app's own strings (app/src/i18n): the headline, what it means (with the
// enforced PAID_CHAT_MESSAGES) and the small print. Every other place paid chat is described says the
// same words, so nothing a person reads can drift from the setting.
const strings = { en: JSON.parse(read('app/src/i18n/en.json')), es: JSON.parse(read('app/src/i18n/es.json')) };
const claim = (lang: 'en' | 'es') => ({
  head: String(strings[lang]['paid.chatHeadline']),
  means: String(strings[lang]['paid.fairUse']).replace('%{count}', String(PAID_CHAT_MESSAGES)).replace(/\.$/, ''),
  small: String(strings[lang]['paid.fairUseSmall']),
});
const described: Array<[string, 'en' | 'es']> = [ // the language each file is mainly in
  ['legal/terms.md', 'en'], ['legal/es/terminos.md', 'es'], ['store/listing-en.md', 'en'], ['store/listing-es.md', 'es'],
  ['site/content/questions.mjs', 'en'], ['site/content/blitz-black.mjs', 'en'], ['site/content/blitz-apps.mjs', 'en'],
  ['site/public/index.html', 'en'], ['site/public/es/index.html', 'es'], ['site/public/terms.html', 'en'], ['site/public/es/terminos.html', 'es'],
  ['site/public/free-bible-chat/index.html', 'en'], ['site/public/es/chat-biblico-gratis/index.html', 'es'], ['site/public/black-bible-chat/index.html', 'en'], ['site/public/black-bible-app/index.html', 'en'], ['site/public/bible-app-for-women/index.html', 'en'],
];
const privacy = ['legal/privacy.md', 'legal/es/privacidad.md', 'site/public/privacy.html', 'site/public/es/privacidad.html'];
const everywhere = [...described.map(([f]) => f), ...privacy, 'app/src/i18n/en.json', 'app/src/i18n/es.json', 'worker/src/replies.ts'];

test('every paid-chat number in the copy is the enforced private-message setting', () => {
  for (const f of [...described.map(([f]) => f), ...privacy]) {
    const numbers = [...read(f).matchAll(/(\d+) (?:private messages|mensajes privados)/g)].map(m => Number(m[1]));
    assert.ok(numbers.length > 0, `${f} names no private-message number`);
    assert.deepEqual([...new Set(numbers)], [PAID_CHAT_MESSAGES], f);
  }
});

test('wherever the "unlimited" claim appears, what it means and the small print come right with it, in the app\'s own words', () => {
  for (const [f] of described) {
    const text = read(f);
    let found = 0;
    for (const lang of ['en', 'es'] as const) {
      const c = claim(lang);
      for (const m of text.matchAll(new RegExp(c.head.replace(/^./, ch => `[${ch.toUpperCase()}${ch.toLowerCase()}]`), 'g'))) {
        found++;
        const near = text.slice(m.index!, m.index! + 700);
        assert.ok(near.includes(c.means) && near.includes(c.small), `${f}: "${m[0]}" without "${c.means}" and the small print`);
      }
    }
    assert.ok(found > 0, `${f} describes paid chat without the claim`);
  }
});

test('NEGATIVE: the old pause and never-free wording is gone everywhere (it contradicts the 100-then-free rule)', () => {
  const old = /until the 1st|never switches you to a free provider|chat pauses until|se pausa hasta el día 1|nunca lo pasa a un proveedor gratuito|never falls back to a free provider:|nunca pasa a un proveedor gratuito:|fair use(?: of)?:? \d+|uso (?:justo|razonable)(?: de)?:? \d+|\d+ chat messages a day|\d+ mensajes de chat al día|very heavy use across a month may be paused|month's chat limit|límite de chat de este mes/i;
  for (const f of everywhere) assert.doesNotMatch(read(f), old, f);
});
