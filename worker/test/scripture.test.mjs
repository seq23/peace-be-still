import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scriptureIndex, insertScripture } from '../src/scripture.mjs';

const verses = scriptureIndex('PSA 46:1 God is our refuge and strength, a very present help in trouble.');
test('inserts stored scripture and drops unknown references', () => {
  const result = insertScripture({ text: 'Take heart.', references: ['PSA 46:1', 'PSA 999:1'] }, verses);
  assert.deepEqual(result.answer.scripture, [{ reference: 'PSA 46:1', text: verses.get('PSA 46:1') }]);
});
test('rejects a fabricated long quotation and accepts a stored quotation', () => {
  assert.equal(insertScripture({ text: '“God is our refuge and strength forever.”', references: [] }, verses).ok, false);
  assert.equal(insertScripture({ text: '“God is our refuge and strength”', references: [] }, verses).ok, true);
});
test('fails closed when the stored scripture is unavailable', () => {
  assert.throws(() => scriptureIndex(''), /SCRIPTURE_EMPTY/);
  assert.equal(insertScripture({ text: 'Hello', references: [] }, new Map()).ok, false);
});
