import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runLadder } from '../src/ladder.mjs';

test('tries the free providers in order and stops after a valid structured answer', async () => {
  const calls = [];
  const providers = [
    async () => { calls.push('workers'); throw new Error('unavailable'); },
    async () => { calls.push('gemini'); return { text: 'Take heart.', references: ['Psalm 46:1'] }; },
    async () => { calls.push('openrouter'); throw new Error('should not run'); },
  ];
  assert.deepEqual(await runLadder(providers, {}), { ok: true, answer: { text: 'Take heart.', references: ['Psalm 46:1'] } });
  assert.deepEqual(calls, ['workers', 'gemini']);
});

test('malformed and exhausted providers lead to the named stop', async () => {
  const result = await runLadder([async () => ({ text: 'hello' }), async () => { throw Error('quota'); }], {});
  assert.deepEqual(result, { ok: false, code: 'CHAT_NO_FREE_MODEL' });
});
