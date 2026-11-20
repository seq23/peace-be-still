import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  ageBand, chooseJourney, correctAge, faithContentIssues, initial, journeyLanguage, journeys, journeysFor, migrateSettings,
  needsBirthMonth, partOfDay, RAISE_WAIT_MS, startRoute, tabsFor, voicesFor, withAge, type Settings,
} from '../src/model';
import { t } from '../src/i18n';

const adult: Settings = { ...initial, door: 'faith', age: 'adult', ageSetAt: 0 };

test('birth year routes children, teens and adults and rejects invalid years', () => {
  assert.equal(ageBand(2015, 2026), 'child'); assert.equal(ageBand(2010, 2026), 'teen'); assert.equal(ageBand(2000, 2026), 'adult');
  assert.equal(ageBand(2013, 2026), 'child'); assert.equal(ageBand(2008, 2026), 'teen'); assert.equal(ageBand(2030, 2026), null);
});

test('boundary years ask for the month, and the month decides the band (skipping keeps the younger one)', () => {
  assert.equal(needsBirthMonth(2013, 2026), true); assert.equal(needsBirthMonth(2008, 2026), true); assert.equal(needsBirthMonth(2000, 2026), false);
  assert.equal(ageBand(2013, 2026, 2, 6), 'teen'); assert.equal(ageBand(2013, 2026, 8, 6), 'child'); assert.equal(ageBand(2013, 2026, undefined, 6), 'child');
  assert.equal(ageBand(2008, 2026, 2, 6), 'adult'); assert.equal(ageBand(2008, 2026, 8, 6), 'teen'); assert.equal(ageBand(2008, 2026, 13, 6), null);
});

test('a re-entry goes younger any time, older once after 7 days, and never up from under 13', () => {
  const teen: Settings = { ...adult, age: 'teen', voice: 'teen', ageSetAt: 1_000 };
  assert.deepEqual(correctAge(teen, 'adult', 1_000 + RAISE_WAIT_MS - 1), { ok: false, reason: 'wait', until: 1_000 + RAISE_WAIT_MS });
  const raised = correctAge(teen, 'adult', 1_000 + RAISE_WAIT_MS);
  assert.ok(raised.ok);
  assert.equal(raised.settings.age, 'adult'); assert.equal(raised.settings.voice, 'plain'); assert.equal(raised.settings.ageRaised, true);
  assert.deepEqual(correctAge({ ...raised.settings, age: 'teen' }, 'adult', 10 * RAISE_WAIT_MS), { ok: false, reason: 'used' });
  assert.deepEqual(correctAge({ ...adult, age: 'child' }, 'teen', 10 * RAISE_WAIT_MS), { ok: false, reason: 'child' });
  const down = correctAge(adult, 'teen', 5);
  assert.ok(down.ok); assert.equal(down.settings.age, 'teen'); assert.equal(down.settings.voice, 'teen');
});

test('journeys are chosen by id; Hush Harbor sets the church voice, Mi Refugio Spanish, a teen always gets teen', () => {
  assert.equal(chooseJourney(adult, 'hush-harbor').voice, 'church');
  assert.equal(chooseJourney(adult, 'hush-harbor').journey, 'hush-harbor');
  assert.equal(chooseJourney(adult, 'mi-refugio').voice, 'spanish');
  assert.equal(chooseJourney({ ...adult, age: 'teen', voice: 'teen' }, 'hush-harbor').voice, 'teen');
  assert.equal(chooseJourney({ ...adult, voice: 'church' }, 'psalm-nights').voice, 'church');
  // Picking a Mindset journey from Settings also moves the door.
  assert.equal(chooseJourney(adult, 'imagination-nights').door, 'mindset');
});

test('a child never sees or gets a chat-led journey, chat voice or Chat tab', () => {
  for (const door of ['faith', 'mindset'] as const) assert.ok(journeysFor(door, 'child').every(j => !j.chat));
  assert.ok(journeysFor('faith', 'adult').some(j => j.chat));
  const child: Settings = { ...adult, age: 'child' };
  assert.equal(chooseJourney(child, 'hush-harbor'), child);
  assert.deepEqual(voicesFor('child'), []); assert.deepEqual(voicesFor('teen'), ['teen']);
  assert.equal(withAge({ ...adult, journey: 'hush-harbor', voice: 'church' }, 'child').journey, undefined);
  assert.deepEqual(tabsFor(child), ['today', 'bible', 'nights', 'more']);
  assert.deepEqual(tabsFor({ ...adult, door: 'mindset' }), ['today', 'chat', 'nights', 'more']);
});

test('the app opens at the first unfinished step', () => {
  assert.equal(startRoute(initial), '/door');
  assert.equal(startRoute({ ...initial, door: 'faith' }), '/age');
  assert.equal(startRoute(adult), '/journeys');
  assert.equal(startRoute({ ...adult, journey: 'psalm-nights' }), '/today');
});

test('saved records from the first previews (journeys by English name) migrate to ids', () => {
  const old = migrateSettings({ door: 'faith', age: 'adult', voice: 'plain', language: 'en', journey: 'Hush Harbor' }, 42);
  assert.equal(old.journey, 'hush-harbor'); assert.equal(old.ageSetAt, 42);
  assert.equal(migrateSettings({ door: 'mindset', age: 'adult', journey: 'Morning Word' }).journey, 'morning-word-mindset');
  assert.equal(migrateSettings({ door: 'faith', age: 'adult', journey: 'Morning Word' }).journey, 'morning-word');
  assert.equal(migrateSettings({ door: 'faith', age: 'child', journey: 'Mi Refugio' }).journey, undefined);
  assert.equal(migrateSettings({ door: 'faith', age: 'adult', journey: 'imagination-nights' }).journey, undefined);
  assert.deepEqual(migrateSettings(null), { ...initial, ageSetAt: undefined, ageRaised: undefined, journey: undefined, scripture: undefined });
});

test('Mi Refugio screens are Spanish whatever the app language', () => {
  assert.equal(journeyLanguage({ ...adult, journey: 'mi-refugio' }), 'es');
  assert.equal(journeyLanguage({ ...adult, journey: 'hush-harbor' }), 'en');
  assert.equal(journeyLanguage({ ...adult, language: 'es', journey: 'psalm-nights' }), 'es');
});

test('the greeting follows the hour', () => {
  assert.deepEqual([6, 11, 12, 17, 18, 23, 2].map(partOfDay), ['morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening', 'evening']);
});

test('faith content gate rejects banned vocabulary, marks, emoji and sparkles; God\'s Word journeys pass it', () => {
  for (const value of ['mindset', 'mentalidad', 'manifestar', 'el universo', 'energía', 'law of assumption', 'Black—Bible\nStories', 'Speak Life', 'urban', '✨', 'sparkles']) assert.ok(faithContentIssues(value).length, value);
  for (const journey of journeys.filter(j => j.door === 'faith')) for (const locale of ['en', 'es']) {
    const text = [journey.name, journey.subtitle, journey.purpose].map(key => key ? t(key, { locale }) : '').join(' ');
    assert.deepEqual(faithContentIssues(text), [], text);
  }
});
