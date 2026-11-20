import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crisisReply } from '../src/crisis.mjs';

test('crisis replies provide the appropriate support and ordinary messages do not trigger one', () => {
  assert.match(crisisReply('I want to die'), /988/);
  assert.match(crisisReply('quiero morir', { language: 'es' }), /988.*oprime 2/);
  const teen = crisisReply('he hits me', { ageBand: 'teen' });
  assert.match(teen, /1-800-799-7233/);
  assert.match(teen, /1-800-422-4453/);
  assert.equal(crisisReply('I am feeling tired'), null);
});
