import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { languageOf, setLanguage, t } from '../src/i18n';

test('Spanish phone locales map to Spanish, everything else to English', () => {
  for (const tag of ['es', 'es-MX', 'es_419', 'ES-us']) assert.equal(languageOf(tag), 'es', tag);
  for (const tag of ['en', 'en-US', 'pt-BR', 'eso', '', null, undefined]) assert.equal(languageOf(tag), 'en', String(tag));
});

test('strings follow the chosen language, per call or app-wide', () => {
  setLanguage('es');
  assert.equal(t('door.title'), '¿Qué necesitas esta noche?');
  assert.equal(t('age.continue', { locale: 'en' }), 'Continue');
  assert.equal(t('age.continue', { locale: 'es-MX' }), t('age.continue', { locale: 'es' }));
  setLanguage('en');
  assert.equal(t('door.title'), 'What do you need tonight?');
});

test('values and plurals: the week count and the Start button', () => {
  assert.equal(t('today.week', { count: 1, locale: 'en' }), '1 day this week');
  assert.equal(t('today.week', { count: 4, locale: 'en' }), '4 days this week');
  assert.equal(t('today.week', { count: 1, locale: 'es' }), '1 día esta semana');
  assert.equal(t('today.week', { count: 4, locale: 'es' }), '4 días esta semana');
  // The whole sentence is one key, so Spanish never mixes languages ("Comenzar with one" was a prefix hack).
  assert.equal(t('journeys.start', { name: 'Mi Refugio', locale: 'es' }), 'Comenzar Mi Refugio');
  assert.equal(t('journeys.intro', { locale: 'es' }), 'Empieza con uno. Puedes cambiarlo cuando quieras en Ajustes.');
});
