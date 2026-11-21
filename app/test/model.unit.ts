import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  ageBand, chooseJourney, correctAge, faithContentIssues, initial, journeyLanguage, journeys, journeysFor, markOpened, migrateSettings,
  needsBirthMonth, openedThisWeek, partOfDay, RAISE_WAIT_MS, startRoute, tabsFor, voicesFor, withAge, type Settings,
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

test('journeys are chosen by id; Bible Chat & Stories (first for every adult) sets the plain voice, Hush Harbor the church voice, Mi Refugio Spanish, a teen always gets teen', () => {
  assert.equal(journeysFor('faith', 'adult')[0].id, 'bible-chat');
  assert.deepEqual(journeysFor('faith', 'adult').map(j => j.id), ['bible-chat', 'hush-harbor', 'mi-refugio', 'psalm-nights', 'morning-word']);
  assert.equal(chooseJourney({ ...adult, voice: 'church' }, 'bible-chat').voice, 'plain');
  assert.equal(chooseJourney(adult, 'bible-chat').journey, 'bible-chat');
  assert.equal(chooseJourney({ ...adult, age: 'teen', voice: 'teen' }, 'bible-chat').voice, 'teen');
  const kid: Settings = { ...adult, age: 'child' };
  assert.equal(chooseJourney(kid, 'bible-chat'), kid, 'chat-led, so never for under-13s');
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
  assert.deepEqual(migrateSettings(null), { ...initial, ageSetAt: undefined, ageRaised: undefined, journey: undefined, scripture: undefined, opened: undefined });
});

test('Mi Refugio screens are Spanish whatever the app language', () => {
  assert.equal(journeyLanguage({ ...adult, journey: 'mi-refugio' }), 'es');
  assert.equal(journeyLanguage({ ...adult, journey: 'hush-harbor' }), 'en');
  assert.equal(journeyLanguage({ ...adult, language: 'es', journey: 'psalm-nights' }), 'es');
});

test('the greeting agrees with "tonight": good evening from 5 pm to 5 am, no greeting at other hours', () => {
  assert.deepEqual([4, 5, 6, 11, 12, 16, 17, 18, 23, 0].map(partOfDay), ['evening', null, null, null, null, null, 'evening', 'evening', 'evening', 'evening']);
});

test('the week count: the days opened this week, pruned to this week, today always included', () => {
  const wed = new Date(2026, 10, 18, 9); // Wednesday 18 Nov 2026; the week is Sun 15 to Sat 21
  const first = markOpened({ ...adult, opened: ['2026-11-10', '2026-11-16'] }, wed)!;
  assert.deepEqual(first.opened, ['2026-11-16', '2026-11-18']);
  assert.equal(markOpened(first, wed), null);
  assert.deepEqual([...openedThisWeek({ ...adult, opened: ['2026-11-10', '2026-11-15'] }, wed)].sort(), ['2026-11-15', '2026-11-18']);
  assert.deepEqual(migrateSettings({ ...adult, opened: ['2026-11-16', 7, 'soon'] }).opened, ['2026-11-16']);
});

test('Young Faith is offered to 13 to 17 year olds only, and a teen\'s picker opens on it', () => {
  assert.ok(!journeysFor('faith', 'child').some(j => j.id === 'young-faith'));
  assert.ok(!journeysFor('faith', 'adult').some(j => j.id === 'young-faith'));
  assert.equal(journeysFor('faith', 'teen')[0].id, 'young-faith');
  assert.equal(chooseJourney({ ...adult, age: 'child' }, 'young-faith').journey, undefined);
  assert.equal(withAge({ ...adult, age: 'teen', journey: 'young-faith', voice: 'teen' }, 'adult').journey, undefined);
});

test('faith content gate rejects banned vocabulary, marks, emoji and sparkles; God\'s Word journeys pass it', () => {
  for (const value of ['mindset', 'mentalidad', 'manifestar', 'el universo', 'energía', 'law of assumption', 'Black—Bible\nStories', 'Speak Life', 'urban', '✨', 'sparkles']) assert.ok(faithContentIssues(value).length, value);
  for (const journey of journeys.filter(j => j.door === 'faith')) for (const locale of ['en', 'es']) {
    const text = [journey.name, journey.subtitle, journey.purpose].map(key => key ? t(key, { locale }) : '').join(' ');
    assert.deepEqual(faithContentIssues(text), [], text);
  }
});
