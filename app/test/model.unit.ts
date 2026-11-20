import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ageBand, faithJourneys, initial, withAge, correctAge, faithContentIssues } from '../src/model';
test('birth year routes children, teens and adults and rejects invalid years', () => {
  assert.equal(ageBand(2015, 2026), 'child'); assert.equal(ageBand(2010, 2026), 'teen'); assert.equal(ageBand(2000, 2026), 'adult'); assert.equal(ageBand(2013, 2026), 'child'); assert.equal(ageBand(2008, 2026), 'teen'); assert.equal(ageBand(2030, 2026), null);
  assert.equal(withAge(initial, 'teen').voice, 'teen');
});
test('faith journey names exclude the other door vocabulary', () => {
  assert.doesNotMatch(JSON.stringify(faithJourneys), /mindset|manifest|neville|law of attraction|universe/i);
});

test('faith content gate rejects banned vocabulary, marks, emoji and sparkles', () => {
  for (const value of ['mindset', 'mentalidad', 'manifestar', 'el universo', 'energía', 'law of assumption', 'Black—Bible\nStories', 'Speak Life', 'urban', '✨', 'sparkles']) assert.ok(faithContentIssues(value).length, value);
  for (const [name, detail] of faithJourneys) assert.deepEqual(faithContentIssues(`${name} ${detail}`), []);
});

test('boundary months and age corrections are conservative', () => {
  assert.equal(ageBand(2013, 2026, 2, 6), 'teen');
  assert.equal(ageBand(2013, 2026, 8, 6), 'child');
  assert.equal(ageBand(2008, 2026, 2, 6), 'adult');
  assert.equal(ageBand(2008, 2026, 8, 6), 'teen');
  assert.equal(ageBand(2008, 2026, 13, 6), null);
  assert.equal(correctAge({...initial, age: 'child'}, 'adult').age, 'child');
  assert.equal(correctAge({...initial, age: 'adult'}, 'teen').age, 'teen');
});
