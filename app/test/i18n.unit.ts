import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { i18n, languageOf, setLanguage, t } from '../src/i18n';

test('Spanish phone locales map to Spanish, everything else to English', () => {
  for (const tag of ['es', 'es-MX', 'es_419', 'ES-us']) assert.equal(languageOf(tag), 'es', tag);
  for (const tag of ['en', 'en-US', 'pt-BR', 'eso', '', null, undefined]) assert.equal(languageOf(tag), 'en', String(tag));
});

test('strings follow the chosen language and fall back to English, then to the text itself', () => {
  setLanguage('es');
  assert.equal(t('What do you need tonight?'), '¿Qué necesitas esta noche?');
  assert.equal(t('Continue', { locale: 'en' }), 'Continue');
  assert.equal(t('Continue', { locale: 'es-MX' }), t('Continue', { locale: 'es' }));
  i18n.store({ en: { 'Only in English': 'Only in English' } });
  assert.equal(t('Only in English'), 'Only in English');
  assert.equal(t('Hush Harbor · Black Bible Chat & Stories'), 'Hush Harbor · Black Bible Chat & Stories');
  setLanguage('en');
});

test('values and plurals: "N of 10 messages left today"', () => {
  const key = '%{count} of %{limit} messages left today';
  assert.equal(t(key, { count: 3, limit: 10, locale: 'en' }), '3 of 10 messages left today');
  assert.equal(t(key, { count: 1, limit: 10, locale: 'es' }), 'Te queda 1 de 10 mensajes hoy');
  assert.equal(t(key, { count: 3, limit: 10, locale: 'es' }), 'Te quedan 3 de 10 mensajes hoy');
  assert.equal(t('Start %{name}', { name: 'Mi Refugio', locale: 'es' }), 'Comenzar Mi Refugio');
});
