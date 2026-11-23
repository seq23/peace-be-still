import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { FREE_CHAT_MESSAGES, PAID_CHAT_MESSAGES } from '../src/gates';

// Every place paid chat is described to people says the fair-use number the worker enforces
// (PAID_CHAT_MESSAGES) and the monthly heavy-use pause (CHAT_USER_MONTHLY_USD_*), in EN and ES.
const root = new URL('../../', import.meta.url);
// Pages are built with typographic apostrophes; the words are the same.
const read = (f: string) => readFileSync(new URL(f, root), 'utf8').replace(/\u2019/g, "'");
// The copy source is the app's own strings (app/src/i18n): the headline, the training promise and the
// small print (with the enforced PAID_CHAT_MESSAGES). Every other place paid chat is described says the
// same words, so nothing a person reads can drift from the setting.
const strings = { en: JSON.parse(read('app/src/i18n/en.json')), es: JSON.parse(read('app/src/i18n/es.json')) };
const claim = (lang: 'en' | 'es', head: 'paid.chatHeadline' | 'paid.chatHeadlineMindset' = 'paid.chatHeadline') => ({
  head: String(strings[lang][head]),
  promise: String(strings[lang]['paid.noTraining']),
  small: String(strings[lang]['paid.fairUse']).replace('%{count}', String(PAID_CHAT_MESSAGES)),
});
const described: Array<[string, 'en' | 'es']> = [ // the language each file is mainly in
  ['legal/terms.md', 'en'], ['legal/es/terminos.md', 'es'], ['store/listing-en.md', 'en'], ['store/listing-es.md', 'es'],
  ['site/content/questions.mjs', 'en'], ['site/content/blitz-black.mjs', 'en'], ['site/content/blitz-apps.mjs', 'en'],
  ['site/public/index.html', 'en'], ['site/public/es/index.html', 'es'], ['site/public/terms.html', 'en'], ['site/public/es/terminos.html', 'es'],
  ['site/public/free-bible-chat/index.html', 'en'], ['site/public/es/chat-biblico-gratis/index.html', 'es'], ['site/public/black-bible-chat/index.html', 'en'], ['site/public/black-bible-app/index.html', 'en'], ['site/public/bible-app-for-women/index.html', 'en'],
  ['site/public/mindset/index.html', 'en'], ['site/public/es/mentalidad/index.html', 'es'],
];
const privacy = ['legal/privacy.md', 'legal/es/privacidad.md', 'site/public/privacy.html', 'site/public/es/privacidad.html'];
const everywhere = [...described.map(([f]) => f), ...privacy, 'app/src/i18n/en.json', 'app/src/i18n/es.json', 'worker/src/replies.ts'];

test('every paid-chat number in the copy is the enforced private-message setting', () => {
  for (const f of [...described.map(([f]) => f), ...privacy]) {
    const numbers = [...read(f).matchAll(/(\d+) (?:private messages|mensajes privados)|(?:[Pp]rivate for up to|[Pp]rivado hasta) (\d+) (?:messages|mensajes)/g)].map(m => Number(m[1] ?? m[2]));
    assert.ok(numbers.length > 0, `${f} names no private-message number`);
    assert.deepEqual([...new Set(numbers)], [PAID_CHAT_MESSAGES], f);
  }
});

test('wherever the "unlimited" claim appears, what it means and the small print come right with it, in the app\'s own words', () => {
  for (const [f] of described) {
    const text = read(f);
    let found = 0;
    // Either headline: "Unlimited Bible chat, kept private" (God's Word) or "Unlimited chat, kept private"
    // (Mindset and the two-door home pages, 21 Nov 2026); each must carry the promise and the small print.
    for (const lang of ['en', 'es'] as const) for (const key of ['paid.chatHeadline', 'paid.chatHeadlineMindset'] as const) {
      const c = claim(lang, key);
      for (const m of text.matchAll(new RegExp(c.head.replace(/^./, ch => `[${ch.toUpperCase()}${ch.toLowerCase()}]`), 'g'))) {
        found++;
        const near = text.slice(m.index!, m.index! + 700);
        assert.ok(near.includes(c.promise) && near.includes(c.small), `${f}: "${m[0]}" without "${c.promise}" and "${c.small}"`);
      }
    }
    assert.ok(found > 0, `${f} describes paid chat without the claim`);
  }
});

test('NEGATIVE: the old pause, never-free, 100-a-day and heavy-use wording is gone everywhere, and no "not kept" claim (Google logs paid prompts for abuse monitoring)', () => {
  const old = /until the 1st|never switches you to a free provider|chat pauses until|se pausa hasta el día 1|nunca lo pasa a un proveedor gratuito|never falls back to a free provider:|nunca pasa a un proveedor gratuito:|fair use(?: of)?:? \d+|uso (?:justo|razonable)(?: de)?:? \d+|\d+ chat messages a day|\d+ mensajes de chat al día|very heavy use across a month may be paused|month's chat limit|límite de chat de este mes|if the paid service is down, the app says so|si el servicio de pago no funciona, la app lo dice|100 private|100 mensajes privados|very heavy use across a month|uso muy intenso durante el mes|not kept by the AI companies|no lo guardan las empresas de IA/i;
  for (const f of everywhere) assert.doesNotMatch(read(f), old, f);
});

test('the terms and privacy policy name every time free chat is offered to a paid user, including while the paid service is down', () => {
  for (const [f, down] of [['legal/terms.md', 'or while the paid service is down'], ['legal/privacy.md', 'or while the paid service is down'], ['site/public/terms.html', 'or while the paid service is down'], ['site/public/privacy.html', 'or while the paid service is down'],
    ['legal/es/terminos.md', 'o mientras el servicio de pago no esté disponible'], ['legal/es/privacidad.md', 'o mientras el servicio de pago no esté disponible'], ['site/public/es/terminos.html', 'o mientras el servicio de pago no esté disponible'], ['site/public/es/privacidad.html', 'o mientras el servicio de pago no esté disponible']]) {
    assert.ok(read(f).includes(down), `${f} does not cover the outage path`);
  }
});

test('the privacy policy names the paid model and every host the Worker may send paid chat to, and the backup', () => {
  const vars = read('worker/wrangler.jsonc');
  const v = (name: string) => vars.match(new RegExp(`"${name}": "([^"]*)"`))?.[1] ?? '';
  const shown: Record<string, string> = { deepinfra: 'DeepInfra', together: 'Together', fireworks: 'Fireworks' };
  const hosts = v('PAID_HOSTS').split(',').filter(Boolean);
  assert.equal(v('PAID_PROVIDER'), 'openrouter-zdr');
  assert.ok(hosts.length > 0);
  for (const f of ['legal/privacy.md', 'legal/es/privacidad.md', 'site/public/privacy.html', 'site/public/es/privacidad.html']) {
    const text = read(f);
    for (const h of hosts) assert.ok(shown[h] && text.includes(shown[h]), `${f} does not name ${h}`);
    assert.ok(text.includes('DeepSeek V4.1 Flash') && text.includes('OpenRouter'), `${f} does not name the paid model`);
    assert.ok(/Google Gemini (?:on a paid plan|en un plan de pago)/.test(text), `${f} does not name the paid backup`);
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

test('every message count in customer copy is the setting: the free day is FREE_CHAT_MESSAGES, private ones PAID_CHAT_MESSAGES', () => {
  // Store text (App Store and Play, every language and caption), legal, the site, the app's strings and the
  // social post banks and their caption code: a number written as a word counts too ("ten messages").
  const files = execSync('git ls-files app/src/i18n store legal site/content site/public data/threads data/instagram scripts/threads scripts/instagram', { cwd: new URL('.', root) }).toString().split('\n')
    .filter(f => /\.(json|md|mjs|html|txt|xml)$/.test(f));
  assert.ok(files.some(f => f.startsWith('store/google-play/')) && files.some(f => f.startsWith('data/threads/')), 'the Play listings and the social banks are scanned');
  const spelled: Record<string, number> = {};
  ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'fifteen', 'twenty', 'thirty', 'fifty']
    .forEach((w, i) => { spelled[w] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20, 30, 50][i]; });
  ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'quince', 'veinte', 'treinta', 'cincuenta']
    .forEach((w, i) => { spelled[w] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20, 30, 50][i]; });
  const count = new RegExp(`\\b(\\d+|${Object.keys(spelled).join('|')}) (?:free |more free |private )?(?:messages|mensajes)|메시지 (\\d+)개`, 'gi');
  let free = 0;
  for (const f of files) {
    const text = read(f);
    for (const m of text.matchAll(count)) {
      const word = (m[1] ?? '').toLowerCase();
      const n = m[2] ? Number(m[2]) : /^\d+$/.test(word) ? Number(word) : spelled[word];
      const before = text.slice(Math.max(0, m.index! - 40), m.index! + m[0].length + 12);
      const paid = /private|privad|paid|pago|plan\b/i.test(before);
      assert.equal(n, paid ? PAID_CHAT_MESSAGES : FREE_CHAT_MESSAGES, `${f}: "${before.replace(/\s+/g, ' ')}"`);
      if (!paid) free++;
    }
  }
  assert.ok(free > 30, `only ${free} free counts found: the scan read nothing`);
  // The limit moment's own lines take the number and price at run time, never a typed one.
  const en = JSON.parse(read('app/src/i18n/en.json')), es = JSON.parse(read('app/src/i18n/es.json'));
  for (const t of [en, es]) {
    assert.match(t['chat.limit.tomorrow'], /%\{count\}/);
    assert.match(t['chat.limit.upgrade'], /%\{price\}/);
    assert.doesNotMatch(t['chat.limit.upgrade'] + t['chat.limit.tomorrow'], /\d/);
  }
  assert.ok(en['chat.limit.upgrade'].includes(en['paid.chatHeadline']));
});
