import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { PAID_CHAT_MESSAGES } from '../src/gates';

// Every place paid chat is described to people says the fair-use number the worker enforces
// (PAID_CHAT_MESSAGES) and the monthly heavy-use pause (CHAT_USER_MONTHLY_USD_*), in EN and ES.
const root = new URL('../../', import.meta.url);
const read = (f: string) => readFileSync(new URL(f, root), 'utf8');
// Her ruling 21 Nov 2026: "Unlimited Bible chat", and right with it what that means.
const EN = (n: number) => `${n} private messages a day, then free chat (not private)`;
const ES = (n: number) => `${n} mensajes privados al día, y después chat gratis (no privado)`;
const described: Array<[string, 'en' | 'es']> = [ // the language each file is mainly in
  ['legal/terms.md', 'en'], ['legal/es/terminos.md', 'es'], ['store/listing-en.md', 'en'], ['store/listing-es.md', 'es'],
  ['site/content/questions.mjs', 'en'], ['site/content/blitz-black.mjs', 'en'], ['site/content/blitz-apps.mjs', 'en'],
  ['site/public/index.html', 'en'], ['site/public/es/index.html', 'es'], ['site/public/terms.html', 'en'], ['site/public/es/terminos.html', 'es'],
  ['site/public/free-bible-chat/index.html', 'en'], ['site/public/es/chat-biblico-gratis/index.html', 'es'], ['site/public/black-bible-chat/index.html', 'en'], ['site/public/black-bible-app/index.html', 'en'], ['site/public/bible-app-for-women/index.html', 'en'],
];
const privacy = ['legal/privacy.md', 'legal/es/privacidad.md', 'site/public/privacy.html', 'site/public/es/privacidad.html'];

test('every paid-chat number in the copy is the enforced private-message setting; no old fair-use or pause wording', () => {
  for (const f of [...described.map(([f]) => f), ...privacy]) {
    const text = read(f);
    const numbers = [...text.matchAll(/(\d+) (?:private messages a day|mensajes privados al día)/g)].map(m => Number(m[1]));
    assert.ok(numbers.length > 0, `${f} names no private-message number`);
    assert.deepEqual([...new Set(numbers)], [PAID_CHAT_MESSAGES], f);
    assert.doesNotMatch(text, /fair use(?: of)?:? \d+|uso (?:justo|razonable)(?: de)?:? \d+|\d+ chat messages a day|\d+ mensajes de chat al día|very heavy use|uso muy intenso/i, f);
  }
});

test('where paid chat is described, "Unlimited Bible chat" comes with what it means, from the setting', () => {
  for (const [f] of described) {
    const text = read(f);
    const heads = [...text.matchAll(/[Uu]nlimited Bible chat|[Cc]hat bíblico ilimitado/g)];
    assert.ok(heads.length > 0, `${f} has no headline`);
    for (const m of heads) {
      const es = /ilimitado/.test(m[0]);
      assert.ok(text.slice(m.index!, m.index! + 500).includes(es ? ES(PAID_CHAT_MESSAGES) : EN(PAID_CHAT_MESSAGES)), `${f}: "${m[0]}" without its disclosure`);
    }
  }
  const en = JSON.parse(read('app/src/i18n/en.json')), es = JSON.parse(read('app/src/i18n/es.json'));
  assert.equal(en['paid.chatHeadline'], 'Unlimited Bible chat');
  assert.equal(es['paid.chatHeadline'], 'Chat bíblico ilimitado');
  assert.equal(en['paid.fairUse'], `${EN(0).replace('0', '%{count}')}.`);
  assert.equal(es['paid.fairUse'], `${ES(0).replace('0', '%{count}')}.`);
});
