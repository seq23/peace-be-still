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
    assert.match(t(regionHelp('US').text), /988/);
    // No region (an unreadable phone setting) or one with no row: findahelpline, never a US-only number.
    for (const region of [null, 'FR', 'MO']) assert.equal(regionHelp(region, language).text, 'chat.help.other', String(region));
  }
  setLanguage('en');
});

test('every region in every language: its own line from the one table, one [link] per number, no 988 outside the US', () => {
  const lines: Record<string, RegExp> = { MX: /800 911 2000.*911/, ES: /024.*112/, KR: /109.*119/, TW: /1925.*119/, HK: /2389 2222.*999/, CN: /12356.*120/ };
  for (const language of ['en', 'es', 'ko', 'zh-Hans', 'zh-Hant'] as const) {
    for (const region of ['US', 'MX', 'ES', 'KR', 'TW', 'HK', 'CN', 'FR', null]) {
      const help = regionHelp(region, language);
      const shown = t(help.text, { ...help.values, locale: language });
      const tag = `${language} ${region}`;
      assert.equal((shown.match(/\[[^\]]+\]/g) ?? []).length, help.links.length, tag);
      assert.ok(!shown.includes('%{'), `${tag}: ${shown}`);
      for (const link of help.links) assert.ok(!t(link.label, { ...link.values, locale: language }).includes('%{'), tag);
      if (region && lines[region]) { assert.match(shown, lines[region], tag); assert.ok(!/988/.test(shown), tag); }
      if (region === 'US') assert.match(shown, /988/, tag);
    }
  }
});

test('the crisis card buttons follow the reply text, in its order, from the same table', () => {
  const { crisisLinks } = require('../src/chat/crisisLines') as typeof import('../src/chat/crisisLines');
  const urls = (text: string) => crisisLinks(text, 'en').map(l => l.url);
  assert.deepEqual(urls('지금 바로 자살예방상담전화 109에 전화해 주세요. 24시간 언제든 받아요. 지금 위험하다면 119에 전화하세요.'), ['tel:109', 'tel:119']);
  assert.deepEqual(urls('請現在就撥打安心專線1925，免費，24 小時都有人接聽。如果你現在有危險，請撥打 119。'), ['tel:1925', 'tel:119']);
  assert.deepEqual(urls('请现在就拨打心理援助热线12356。如果你现在有危险，请拨打 120。'), ['tel:12356', 'tel:120']);
  assert.deepEqual(urls('Please call Línea de la Vida at 800 911 2000, free, any time. If you are in danger right now, call 911.'), ['tel:8009112000', 'tel:911']);
  assert.deepEqual(urls('Please reach out right now to the 988 Suicide & Crisis Lifeline. If you are in danger this minute, call 911.'), ['tel:988', 'sms:988']);
  assert.deepEqual(urls("Please don't take any extra. call Poison Control now at 1-800-222-1222. call 911 now. call or text 988."), ['tel:18002221222', 'tel:911', 'tel:988', 'sms:988']);
  assert.deepEqual(urls('Please reach a crisis line where you live: findahelpline.com lists free ones.'), ['https://findahelpline.com']);
  assert.deepEqual(urls('지금 있는 곳의 위기 상담 전화에 연락해 주세요. findahelpline.com에서 찾을 수 있어요.'), ['https://findahelpline.com']);
  assert.deepEqual(urls('请联系你所在地的危机热线：findahelpline.com 列出了免费热线。'), ['https://findahelpline.com']);
  assert.deepEqual(urls('see notfindahelpline.com.evil.example'), []);
  // A KR reply never offers a US button, and a phone number that merely contains a line's digits is not that line.
  assert.ok(!urls('지금 바로 109에 전화해 주세요. 지금 위험하다면 119에 전화하세요.').some(u => u.includes('988') || u.includes('911')));
  assert.deepEqual(urls('Please call 1-800-799-7233. If you ever think about ending your life, call or text 988. If you are in danger this minute, call 911.'), ['tel:18007997233', 'sms:88788?body=START', 'tel:988', 'sms:988']);
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

test('Traditional strings use Taiwan usage OpenCC misses: 帳戶/帳號, and 「」 quotation marks, never “”', () => {
  const hant = readFileSync('src/i18n/zh-Hant.json', 'utf8');
  for (const simplifiedUsage of ['賬戶', '賬號', '“', '”']) assert.ok(!hant.includes(simplifiedUsage), simplifiedUsage);
  const values = JSON.parse(hant) as Record<string, unknown>;
  assert.match(String(values['paid.apple']), /Apple 帳戶/);
  assert.match(String(values['paid.madeForYouNote']), /「為你定製」/);
});
