import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { LANGUAGES, i18n, languageOf, setLanguage, t } from '../src/i18n';
import { TRANSLATION_CREDIT, TRANSLATION_OF, citation } from '../src/bible/core';
import { faithContentIssues, migrateSettings } from '../src/model';
import { regionHelp } from '../src/chat/regionHelp';
import { MICROPHONE } from '../app.config';

test('phone locales map to Spanish, Korean, Simplified or Traditional Chinese, everything else to English', () => {
  for (const tag of ['es', 'es-MX', 'es_419', 'ES-us']) assert.equal(languageOf(tag), 'es', tag);
  for (const tag of ['ko', 'ko-KR', 'ko_US']) assert.equal(languageOf(tag), 'ko', tag);
  for (const tag of ['zh', 'zh-CN', 'zh-Hans', 'zh-Hans-US', 'zh-SG', 'zh-Hans-HK', 'zh_MY']) assert.equal(languageOf(tag), 'zh-Hans', tag);
  for (const tag of ['zh-TW', 'zh-HK', 'zh-MO', 'zh-Hant', 'zh-Hant-TW', 'zh_Hant_US']) assert.equal(languageOf(tag), 'zh-Hant', tag);
  for (const tag of ['en', 'en-US', 'pt-BR', 'eso', 'kok', 'zha', '', null, undefined]) assert.equal(languageOf(tag), 'en', String(tag));
});

test('a saved Korean or Chinese choice survives a restart; anything else reads as English', () => {
  for (const language of LANGUAGES) assert.equal(migrateSettings({ language }).language, language);
  assert.equal(migrateSettings({ language: 'fr' }).language, 'en');
});

test('a key missing in Korean or Chinese never shows English: there is no fallback', () => {
  const store = i18n.translations as Record<string, Record<string, unknown>>;
  const saved = store.ko['door.title'];
  delete store.ko['door.title'];
  try {
    const shown = t('door.title', { locale: 'ko' });
    assert.notEqual(shown, 'What do you need tonight?');
    assert.match(shown, /missing/);
  } finally { store.ko['door.title'] = saved; }
  assert.equal(i18n.enableFallback, false);
});

test('no Korean or Chinese string names a price: every price is the store\'s own localized %{price}', () => {
  for (const lang of ['ko', 'zh-Hans', 'zh-Hant'] as const) {
    const text = readFileSync(`src/i18n/${lang}.json`, 'utf8');
    for (const literal of ['$', '7.99', '39.99', '₩', '￥', '¥', 'USD', 'KRW', 'TWD', 'HKD', 'CNY', '달러', '美元', '美金', '人民币', '新台币', '新台幣', '港币', '港幣', '韩元', '韓元']) {
      assert.ok(!text.includes(literal), `${lang}.json types a price by hand: ${literal}`);
    }
  }
});

test('the crisis line follows the phone region, never the language: a Korean or Chinese phone in the US gets 988', () => {
  for (const language of ['ko', 'zh-Hans', 'zh-Hant'] as const) {
    setLanguage(language);
    assert.equal(regionHelp('US').text, 'chat.help.us');
    assert.equal(regionHelp(null).text, 'chat.help.us');
    assert.match(t(regionHelp('US').text), /988/);
    assert.match(t(regionHelp('KR').text), /findahelpline\.com/);
  }
  setLanguage('en');
});

test('each language reads its own Bible, and a Korean or Chinese verse always carries its credit line', () => {
  assert.deepEqual(TRANSLATION_OF, { en: 'KJV', es: 'RV1909', ko: 'KRV', 'zh-Hans': 'CUVS', 'zh-Hant': 'CUVT' });
  const krv = JSON.parse(readFileSync('../content/bible/krv_source.json', 'utf8'));
  const cuv = JSON.parse(readFileSync('../content/bible/cuv_source.json', 'utf8'));
  assert.equal(TRANSLATION_CREDIT.KRV, krv.credit);
  assert.equal(TRANSLATION_CREDIT.CUVS, cuv.credit);
  assert.equal(citation('시편 23:1', 'KRV'), `시편 23:1 · 개역한글\n${krv.credit}`);
  assert.match(citation('詩篇 23:1', 'CUVT'), /和合本（1919年版，公有領域）/);
  assert.equal(citation('Psalm 23:1', 'KJV'), 'Psalm 23:1 · KJV');
});

test('the Chinese Bible is the 1919 text: 她 (first printed in 1920s editions) is never in it', () => {
  for (const file of ['cuv', 'cuvs']) {
    const text = gunzipSync(readFileSync(`../content/bible/${file}_vpl.txt.gz`)).toString('utf8');
    const lines = text.split('\n').filter(line => line.includes('她'));
    assert.deepEqual(lines, [], `${file}: later-edition pronoun in ${lines.length} verse(s)`);
  }
});

test('Simplified strings use no Traditional-only character; Traditional strings are not Simplified copies', () => {
  const tradOnly = new Set([...JSON.parse(readFileSync('../content/bible/zh_script.json', 'utf8')).tradOnly as string]);
  const hans = readFileSync('src/i18n/zh-Hans.json', 'utf8');
  const hant = JSON.parse(readFileSync('src/i18n/zh-Hant.json', 'utf8')) as Record<string, unknown>;
  const hansObj = JSON.parse(hans) as Record<string, unknown>;
  assert.deepEqual([...hans].filter(ch => tradOnly.has(ch) && !'繁體中文'.includes(ch)), []);
  const changed = Object.keys(hansObj).filter(key => JSON.stringify(hant[key]) !== JSON.stringify(hansObj[key]));
  assert.ok(changed.length > 350, `only ${changed.length} Traditional strings differ from Simplified`);
  assert.equal(hant['door.title'], '今晚你需要什麼？');
});

test('the faith door refuses manifesting words in Korean and Chinese too, even with a particle attached', () => {
  for (const line of ['끌어당김의 법칙으로 기도해요', '시각화를 해 보세요', '用吸引力法则祷告', '宇宙能量會回應你']) assert.ok(faithContentIssues(line).length, line);
  assert.deepEqual(faithContentIssues('주님, 오늘 무슨 일이 있든 주님을 신뢰하도록 도와주세요. 아멘.'), []);
  assert.deepEqual(faithContentIssues('主啊，无论今天发生什么，求你帮助我信靠你。阿们。'), []);
});

test('the iPhone microphone question is written in every app language and each locale file says exactly that', () => {
  for (const lang of ['es', 'ko', 'zh-Hans', 'zh-Hant'] as const) {
    const file = JSON.parse(readFileSync(`locales/${lang}.json`, 'utf8'));
    assert.equal(file.ios.NSMicrophoneUsageDescription, MICROPHONE[lang], lang);
  }
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
