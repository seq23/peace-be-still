import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateAnswer } from '../src/quality.mjs';
import { scriptureIndex } from '../src/scripture.mjs';

const verses = scriptureIndex('PSA 46:1 God is our refuge and strength, a very present help in trouble.');
const input = { door: 'gods-word', ageBand: 'adult', language: 'en' };
test('quality gate inserts stored scripture and rejects fabricated text and faith boundary violations', () => {
  const check = text => validateAnswer({ text, references: ['PSA 46:1'] }, input, verses);
  assert.equal(check('Take heart.').answer.scripture[0].text, verses.get('PSA 46:1'));
  assert.equal(check('“God is our refuge and strength forever.”').ok, false);
  assert.equal(check('Try manifesting a different outcome.').ok, false);
  assert.equal(check('God will heal you.').ok, false);
});
