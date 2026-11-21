import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { execSync } from 'node:child_process';
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
  const old = /until the 1st|never switches you to a free provider|chat pauses until|se pausa hasta el día 1|nunca lo pasa a un proveedor gratuito|never falls back to a free provider:|nunca pasa a un proveedor gratuito:|fair use(?: of)?:? \d+|uso (?:justo|razonable)(?: de)?:? \d+|\d+ chat messages a day|\d+ mensajes de chat al día|very heavy use across a month may be paused|month's chat limit|límite de chat de este mes|if the paid service is down, the app says so|si el servicio de pago no funciona, la app lo dice/i;
  for (const f of everywhere) assert.doesNotMatch(read(f), old, f);
});

test('the terms and privacy policy name every time free chat is offered to a paid user, including while the paid service is down', () => {
  for (const [f, down] of [['legal/terms.md', 'or while the paid service is down'], ['legal/privacy.md', 'or while the paid service is down'], ['site/public/terms.html', 'or while the paid service is down'], ['site/public/privacy.html', 'or while the paid service is down'],
    ['legal/es/terminos.md', 'o mientras el servicio de pago no esté disponible'], ['legal/es/privacidad.md', 'o mientras el servicio de pago no esté disponible'], ['site/public/es/terminos.html', 'o mientras el servicio de pago no esté disponible'], ['site/public/es/privacidad.html', 'o mientras el servicio de pago no esté disponible']]) {
    assert.ok(read(f).includes(down), `${f} does not cover the outage path`);
  }
});

test('NEGATIVE: no customer-facing words say "lane" (internal jargon); code names may', () => {
  const files = execSync('git ls-files app/src/i18n app/src/config/products.json store legal site/content site/public', { cwd: new URL('.', root) }).toString().split('\n')
    .filter(f => /\.(json|md|mjs|html|txt|xml)$/.test(f));
  assert.ok(files.length > 50, `only ${files.length} customer files found`);
  const jargon = /\blanes?\b|\bparte (?:de pago|gratis|gratuita|privada)\b|\bdos partes\b/i;
  // What a person reads: in a page, the text and attributes people see, not the class names.
  const seen = (f: string) => (f.endsWith('.html') ? read(f).replace(/<(script|style)\b[\s\S]*?<\/\1>/g, ' ').replace(/\sclass="[^"]*"/g, ' ') : read(f));
  for (const f of files) assert.doesNotMatch(seen(f), jargon, f);
  const products = JSON.parse(read('app/src/config/products.json'));
  assert.equal(products.subscriptionGroup['en-US'], 'Peace Be Still');
});
