import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chat } from '../src/chat.mjs';

const fixtures = JSON.parse(await readFile(new URL('./fixtures/redteam.json', import.meta.url), 'utf8'));
const forbidden = () => { throw new Error('must not be called'); };
test('red-team crisis and child cases do not invoke admission or models', async () => {
  const cases = fixtures.filter(x => ['crisis_fixed', 'blocked_age'].includes(x.expect.path));
  assert.ok(cases.length);
  for (const x of cases) {
    const result = await chat({ ageBand: x.age_band, door: x.door, language: x.lang, message: x.prompt },
      { admit: forbidden, providers: [forbidden], validate: forbidden });
    if (x.expect.path === 'blocked_age') assert.equal(result.code, 'CHAT_AGE_BLOCKED', x.id);
    else {
      assert.equal(result.kind, 'crisis', x.id);
      assert.match(result.text, /988/, x.id);
      if (x.expect.assert.includes('contains_childhelp')) assert.match(result.text, /1-800-422-4453/, x.id);
      if (x.expect.assert.includes('contains_dv_hotline')) assert.match(result.text, /1-800-799-7233/, x.id);
    }
  }
});

test('forces the teen voice and retries a rejected answer once before fallback', async () => {
  let calls = 0;
  const result = await chat({ ageBand: 'teen', door: 'gods-word', language: 'en', message: 'Help me', voice: 'plain' }, {
    admit: async () => ({ allowed: true }),
    providers: [async request => { assert.equal(request.voice, 'teen'); calls++; return { text: 'bad', references: [] }; }],
    validate: async () => ({ ok: false, reason: 'unsafe' }),
  });
  assert.equal(calls, 2);
  assert.equal(result.kind, 'fallback');
  assert.equal(result.ai, true);
});

test('refuses unconfigured or denied chat without invoking a model', async () => {
  const input = { ageBand: 'adult', door: 'gods-word', language: 'en', message: 'Hello' };
  assert.equal((await chat(input, {})).code, 'CHAT_NOT_CONFIGURED');
  const result = await chat(input, { admit: async () => ({ allowed: false }), providers: [forbidden], validate: forbidden });
  assert.equal(result.code, 'CHAT_LIMIT');
});
