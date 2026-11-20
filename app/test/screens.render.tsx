// The real screens and layouts, rendered (test/support/render-build.mjs supplies host primitives and an
// expo-router recorder). Each test drives a screen the way a person would and checks what is shown, what is
// saved and where the app goes next.
import React from 'react';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { displayRuns } from '../src/bible/core';
import { declaration, relativeDate, dateKey, streak } from '../src/screens/daily/content';
import { test, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { create, act, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { faithContentIssues, RAISE_WAIT_MS, type Settings } from '../src/model';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const quiet = console.error;
console.error = (...args: unknown[]) => { if (!String(args[0]).includes('react-test-renderer is deprecated')) quiet(...args); };
let saved: string | null = null;
let readFails = false;
const local = new Map<string, string>();
(globalThis as any).__pbsStorage = {
  getItem: async (key: string) => {
    if (readFails) throw new Error('unavailable');
    return key === 'peace-be-still-settings' ? saved : local.get(key) ?? null;
  },
  setItem: async (key: string, value: string) => {
    if (key === 'peace-be-still-settings') saved = value;
    else local.set(key, value);
  },
};
type Call = [string, unknown?];
let calls: Call[] = [];
let history = false;
(globalThis as any).__pbsRouter = {
  push: (href: unknown) => calls.push(['push', href]),
  replace: (href: unknown) => calls.push(['replace', href]),
  navigate: (href: unknown) => calls.push(['navigate', href]),
  back: () => calls.push(['back']),
  dismissAll: () => calls.push(['dismissAll']),
  canGoBack: () => history,
  canDismiss: () => history,
};

// Loaded after the globals above exist.
const { Daily } = require('../src/screens/daily/Daily');
const { SettingsProvider, useSettings } = require('../src/settings');
const { i18n } = require('../src/i18n');
const en = require('../src/i18n/en.json');
const es = require('../src/i18n/es.json');
const screens = {
  root: require('../app/_layout'),
  index: require('../app/index').default,
  door: require('../app/(onboarding)/door').default,
  age: require('../app/(onboarding)/age').default,
  journeys: require('../app/(onboarding)/journeys').default,
  tabs: require('../app/(tabs)/_layout').default,
  today: require('../app/(tabs)/today').default,
  chat: require('../app/(tabs)/chat').default,
  bible: require('../app/(tabs)/bible').default,
  biblePage: require('../app/bible/[page]').default,
  dailyPage: require('../app/today/[page]').default,
  nights: require('../app/(tabs)/nights').default,
  more: require('../app/(tabs)/more').default,
  settings: require('../app/settings').default,
  notFound: require('../app/+not-found').default,
};
type Name = Exclude<keyof typeof screens, 'root'>;

const base: Settings = { door: 'faith', age: 'adult', ageSetAt: 0, voice: 'plain', language: 'en' };
const store = () => JSON.parse(saved!) as Settings;

beforeEach(() => { calls = []; history = false; (globalThis as any).__pbsParams = {}; (globalThis as any).__pbsScheme = 'light'; (globalThis as any).__pbsLocale = 'en'; readFails = false; });

async function mount(name: Name, value: object | null = base, params: Record<string, string> = {}, override?: React.ComponentType) {
  saved = value ? JSON.stringify(value) : null;
  (globalThis as any).__pbsParams = params;
  const Screen = override ?? screens[name];
  let tree!: ReactTestRenderer;
  // Like the root layout, a screen is drawn only once the saved settings are read.
  const Ready = () => (useSettings().ready ? <Screen /> : null);
  await act(async () => { tree = create(<SettingsProvider><Ready /></SettingsProvider>); });
  return tree;
}
const scripture = (node: ReactTestInstance): boolean => node.props.testID === 'scripture-text' || (!!node.parent && scripture(node.parent));
const texts = (tree: ReactTestRenderer, includeScripture = true) => tree.root.findAll(n => (n.type as unknown) === 'Text' && (includeScripture || !scripture(n))).map(n => n.children.filter(x => typeof x === 'string').join('')).filter(Boolean);
const strings = (tree: ReactTestRenderer) => texts(tree).join(' | ');
const host = (tree: ReactTestRenderer, type: string) => tree.root.findAll(n => (n.type as unknown) === type);
const textOf = (node: ReactTestInstance) => node.findAll(n => (n.type as unknown) === 'Text').map(t => t.children.filter(x => typeof x === 'string').join('')).join(' ');
async function press(tree: ReactTestRenderer, text: string | RegExp) {
  const match = (s: string) => typeof text === 'string' ? s.includes(text) : text.test(s);
  const target = host(tree, 'Pressable').find(n => match(textOf(n)));
  assert.ok(target, `No button "${text}" in: ${strings(tree)}`);
  await act(async () => target.props.onPress());
}
async function type(tree: ReactTestRenderer, value: string) {
  await act(async () => host(tree, 'TextInput')[0].props.onChangeText(value));
}
const thisYear = new Date().getFullYear();

test('a fresh install opens the front door, and the door choice is saved and moves on to the birth year', async () => {
  const index = await mount('index', null);
  assert.equal(host(index, 'Redirect')[0].props.href, '/door');
  const door = await mount('door', null);
  assert.match(strings(door), /What do you need tonight\?/);
  assert.doesNotMatch(strings(door), /WELCOME|Back/);
  await press(door, "With God's Word");
  assert.equal(store().door, 'faith');
  assert.deepEqual(calls, [['push', '/age']]);
});

test('a returning person opens where they left off', async () => {
  for (const [value, route] of [[{ ...base, age: null }, '/age'], [base, '/journeys'], [{ ...base, journey: 'psalm-nights' }, '/today']] as const) {
    assert.equal(host(await mount('index', value), 'Redirect')[0].props.href, route);
  }
});

test('the tabs and Settings open only once onboarding is done; a deep link before then goes to the first unfinished step', async () => {
  for (const name of ['tabs', 'settings'] as const) {
    assert.equal(host(await mount(name, null), 'Redirect')[0]?.props.href, '/door', name);
    assert.equal(host(await mount(name, base), 'Redirect')[0]?.props.href, '/journeys', name);
    assert.equal(host(await mount(name, { ...base, journey: 'psalm-nights' }), 'Redirect').length, 0, name);
  }
});

test('a font that fails to load (a slow phone) never holds the app on the spinner', async () => {
  (globalThis as any).__pbsFonts = [false, new Error('timed out')];
  try {
    saved = JSON.stringify({ ...base, journey: 'psalm-nights' });
    let tree!: ReactTestRenderer;
    await act(async () => { tree = create(<screens.root.default />); });
    assert.equal(host(tree, 'Stack').length, 1);
  } finally { (globalThis as any).__pbsFonts = undefined; }
});

test('a deep link straight to Settings renders it, and its back link returns to More', async () => {
  const tree = await mount('settings', { ...base, journey: 'psalm-nights' });
  assert.match(strings(tree), /Settings/);
  await press(tree, 'More');
  assert.deepEqual(calls, [['replace', '/more']]);
  history = true; calls = [];
  await press(tree, 'More');
  assert.deepEqual(calls, [['back']]);
});

test('the birth year: a wrong year shows an error that clears as she types, and an adult goes on to the picker', async () => {
  const tree = await mount('age', { ...base, age: null });
  await type(tree, '19');
  await press(tree, 'Continue');
  assert.match(strings(tree), /four-digit year/);
  await type(tree, '199');
  assert.doesNotMatch(strings(tree), /four-digit year/);
  await type(tree, '1990');
  await press(tree, 'Continue');
  assert.equal(store().age, 'adult');
  assert.equal(typeof store().ageSetAt, 'number');
  assert.deepEqual(calls, [['push', '/journeys']]);
});

test('a boundary year asks for the month with twelve tappable months, and skipping keeps the younger band', async () => {
  const tree = await mount('age', { ...base, age: null });
  await type(tree, String(thisYear - 13));
  const months = host(tree, 'Pressable').filter(n => n.props.accessibilityRole === 'radio');
  assert.equal(months.length, 13);
  await press(tree, 'Skip');
  await press(tree, 'Continue');
  assert.equal(store().age, 'child');
  const adultish = await mount('age', { ...base, age: null });
  await type(adultish, String(thisYear - 18));
  await press(adultish, 'Jan');
  await press(adultish, 'Continue');
  assert.equal(store().age, new Date().getMonth() + 1 > 1 ? 'adult' : 'teen');
});

test('a teen who mistyped can move up once after 7 days; a child never can', async () => {
  const teen = { ...base, age: 'teen', voice: 'teen', journey: 'psalm-nights', ageSetAt: Date.now() };
  const early = await mount('age', teen, { correct: '1' });
  assert.match(strings(early), /once, 7 days after/);
  await type(early, '1990'); await press(early, 'Continue');
  assert.match(strings(early), /older age group from/);
  assert.equal(store().age, 'teen');
  const later = await mount('age', { ...teen, ageSetAt: Date.now() - RAISE_WAIT_MS - 1000 }, { correct: '1' });
  await type(later, '1990'); await press(later, 'Continue');
  assert.equal(store().age, 'adult'); assert.equal(store().ageRaised, true);
  assert.deepEqual(calls, [['back']]);
  const child = await mount('age', { ...teen, age: 'child', voice: 'plain', ageSetAt: 0 }, { correct: '1' });
  await type(child, '1990'); await press(child, 'Continue');
  assert.equal(store().age, 'child');
  assert.match(strings(child), /under-13s/);
});

test('correcting down to a child drops a chat-led journey and sends her to pick again', async () => {
  const tree = await mount('age', { ...base, journey: 'hush-harbor', voice: 'church' }, { correct: '1' });
  await type(tree, String(thisYear - 6)); await press(tree, 'Continue');
  assert.equal(store().age, 'child'); assert.equal(store().journey, undefined);
  assert.deepEqual(calls, [['replace', '/journeys']]);
});

test('the picker shows Start for the first journey before any tap, and starting Hush Harbor sets the church voice', async () => {
  const tree = await mount('journeys');
  const start = () => host(tree, 'Pressable').find(n => /^Start /.test(textOf(n)));
  assert.equal(textOf(start()!), 'Start Hush Harbor  ›');
  await press(tree, 'Hush Harbor');
  await press(tree, 'Start Hush Harbor');
  assert.equal(store().journey, 'hush-harbor');
  assert.equal(store().voice, 'church');
  assert.deepEqual(calls.at(-1), ['replace', '/today']);
  const teen = await mount('journeys', { ...base, age: 'teen', voice: 'teen' });
  await press(teen, 'Start Hush Harbor');
  assert.equal(store().voice, 'teen');
});

test('a child sees no chat-led journey, and Start names the first one she can pick', async () => {
  const tree = await mount('journeys', { ...base, age: 'child' });
  assert.doesNotMatch(strings(tree), /Hush Harbor|Mi Refugio/);
  assert.ok(host(tree, 'Pressable').some(n => textOf(n) === 'Start Psalm Nights  ›'));
});

test('the Mindset picker asks the scripture question after its cards, with a switch, and keeps the answer', async () => {
  const tree = await mount('journeys', { ...base, door: 'mindset' });
  const order = texts(tree);
  assert.ok(order.indexOf('Weave scripture in') > order.findIndex(s => s.startsWith('Morning Word')));
  const toggle = host(tree, 'Switch')[0];
  assert.equal(toggle.props.accessibilityRole, 'switch');
  await act(async () => toggle.props.onValueChange(true));
  await press(tree, 'Start Imagination Nights');
  assert.equal(store().scripture, true); assert.equal(store().journey, 'imagination-nights');
});

test('changing the door from Settings keeps the old journey until a new one is started', async () => {
  const tree = await mount('door', { ...base, journey: 'psalm-nights' });
  await press(tree, 'With mindset');
  assert.equal(store().door, 'faith');
  assert.deepEqual(calls, [['push', { pathname: '/journeys', params: { door: 'mindset' } }]]);
  const picker = await mount('journeys', { ...base, journey: 'psalm-nights' }, { door: 'mindset' });
  await press(picker, 'Start Imagination Nights');
  assert.equal(store().door, 'mindset'); assert.equal(store().journey, 'imagination-nights');
});

test('tabs follow the door and the age (expo-router Tabs, hidden with href null)', async () => {
  const shown = async (value: object) => host(await mount('tabs', value), 'Tabs.Screen').filter(n => n.props.options.href !== null).map(n => n.props.options.title);
  assert.deepEqual(await shown({ ...base, journey: 'psalm-nights' }), ['Today', 'Chat', 'Bible', 'Nights', 'More']);
  assert.deepEqual(await shown({ ...base, age: 'child', journey: 'psalm-nights' }), ['Today', 'Bible', 'Nights', 'More']);
  assert.deepEqual(await shown({ ...base, door: 'mindset', journey: 'imagination-nights' }), ['Today', 'Chat', 'Nights', 'More']);
  assert.deepEqual(await shown({ ...base, journey: 'mi-refugio' }), ['Hoy', 'Chat', 'Biblia', 'Noches', 'Más']);
});

test('a typed link cannot open a hidden tab', async () => {
  assert.equal(host(await mount('chat', { ...base, age: 'child', journey: 'psalm-nights' }), 'Redirect')[0].props.href, '/today');
  assert.equal(host(await mount('bible', { ...base, door: 'mindset', journey: 'imagination-nights' }), 'Redirect')[0].props.href, '/today');
  assert.match(strings(await mount('chat', { ...base, journey: 'psalm-nights' })), /One free conversation a day/);
});

test('Today has the date, the week and the three items for the door, with no welcome filler', async () => {
  const faith = await mount('today', { ...base, journey: 'psalm-nights' });
  const shown = strings(faith);
  assert.match(shown, /0 days in a row/);
  assert.match(shown, /Today's declaration.*Today's story.*Tonight: Psalm Nights/);
  assert.doesNotMatch(shown, /WELCOME|Welcome|Good to have you/);
  await press(faith, /^Open  ›$/);
  assert.deepEqual(calls, [['navigate', '/nights']]);
  const mindset = strings(await mount('today', { ...base, door: 'mindset', journey: 'imagination-nights' }));
  assert.match(mindset, /Your scene.*Tonight: Imagination Nights/);
  assert.doesNotMatch(mindset, /Psalm|Bible/);
});

test('More lists Settings, Saved verses and Journal, and opens Settings', async () => {
  const tree = await mount('more', { ...base, journey: 'psalm-nights' });
  assert.match(strings(tree), /Settings.*Saved verses.*Journal/);
  await press(tree, 'Settings');
  assert.deepEqual(calls, [['push', '/settings']]);
});

test('Settings: the voice choices follow the age, and a choice is saved and shown as selected', async () => {
  const adult = await mount('settings', { ...base, journey: 'psalm-nights' });
  await press(adult, 'Black church');
  assert.equal(store().voice, 'church');
  const selected = host(adult, 'Pressable').filter(n => n.props.accessibilityRole === 'radio' && n.props.accessibilityState.checked).map(textOf);
  assert.deepEqual(selected, ['Black church', 'English']);
  const teen = strings(await mount('settings', { ...base, age: 'teen', voice: 'teen', journey: 'psalm-nights' }));
  assert.match(teen, /Teen/); assert.doesNotMatch(teen, /Plain modern/);
  const child = strings(await mount('settings', { ...base, age: 'child', journey: 'psalm-nights' }));
  assert.doesNotMatch(child, /Chat voice|Plain modern|Black church/);
});

test('Mi Refugio: the screens inside it are Spanish, Settings keeps the app language, and the saved language is untouched', async () => {
  const value = { ...base, journey: 'mi-refugio', voice: 'spanish' };
  assert.match(strings(await mount('today', value)), /La declaración de hoy/);
  assert.match(strings(await mount('more', value)), /Ajustes/);
  assert.match(strings(await mount('settings', value)), /Settings/);
  assert.equal(store().language, 'en');
});

test('a Spanish phone starts in Spanish; a saved English choice stays English', async () => {
  (globalThis as any).__pbsLocale = 'es';
  assert.match(strings(await mount('door', null)), /¿Qué necesitas esta noche\?/);
  assert.match(strings(await mount('today', { ...base, journey: 'psalm-nights' })), /Today's declaration/);
});

test('a saved record from the first previews (journey by English name) still opens, and is rewritten by id', async () => {
  const tree = await mount('today', { door: 'faith', age: 'adult', voice: 'plain', language: 'en', journey: 'Hush Harbor' });
  assert.match(strings(tree), /Today's declaration/);
  assert.equal(store().journey, 'hush-harbor');
});

test('a settings read failure shows only the message: nothing can be tapped, so no age limit can be redone', async () => {
  readFails = true;
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<SettingsProvider><screens.root.Root fontsLoaded /></SettingsProvider>); });
  assert.match(strings(tree), /saved settings could not be read/);
  assert.equal(host(tree, 'Pressable').length, 0);
  assert.equal(host(tree, 'Stack').length, 0);
});

// Every screen a God's Word person can reach, for a language and an age band.
async function faithWalk(language: 'en' | 'es', age: 'child' | 'teen' | 'adult') {
  const person = { ...base, age, language, voice: age === 'teen' ? 'teen' : 'plain', journey: 'psalm-nights' };
  const pages: Array<[Name, object, Record<string, string>?]> = [
    ['door', { ...person, door: null, age: null, journey: undefined }], ['age', { ...person, age: null }], ['journeys', person],
    ['today', person], ['bible', person],
    ...['books', 'search', 'saved'].map(page => ['biblePage', person, { page }] as [Name, object, Record<string, string>]),
    ...['declaration', 'story', 'plans', 'journal'].map(page => ['dailyPage', person, { page }] as [Name, object, Record<string, string>]),
    ['nights', person], ['more', person], ['settings', person], ['notFound', person],
  ];
  if (age !== 'child') pages.push(['chat', person]);
  const out: Array<[string, string]> = [];
  // The front door names both doors. Canonical verses are covered by the exact-source tests:
  // the KJV uses “manifest” in John 3:21 and it must remain in the displayed verse.
  for (const [name, value, params] of pages) out.push([`${name} ${language} ${age}`, texts(await mount(name, value, params), false).join(' | ').replace(/With mindset & imagination|Con mente e imaginación/g, '')]);
  return out;
}

test('God\'s Word screens, in both languages and every age band, pass the shared content gate', async () => {
  for (const language of ['en', 'es'] as const) for (const age of ['child', 'teen', 'adult'] as const) {
    for (const [where, shown] of await faithWalk(language, age)) assert.deepEqual(faithContentIssues(shown), [], where);
  }
});

test('the God\'s Word gate fails a screen when a banned word reaches its data', async () => {
  const purpose = en['journey.psalmNights.purpose'];
  i18n.store({ en: { 'journey.psalmNights.purpose': `${purpose}, to manifest rest` } });
  try {
    const failures = (await faithWalk('en', 'adult')).filter(([, shown]) => faithContentIssues(shown).length);
    assert.deepEqual(failures.map(([where]) => where), ['journeys en adult']);
  } finally { i18n.store({ en: { 'journey.psalmNights.purpose': purpose } }); }
});

test('Spanish screens show no English: no rendered text is an English string that has a Spanish one', async () => {
  // Names that stay as they are in Spanish: the app, the journeys, the language picker's own names.
  const sameInBoth = new Set(['Peace Be Still', 'Hush Harbor', 'Mi Refugio', 'Biblia y Chat en Español', 'Psalm Nights', 'Morning Word', 'Young Faith', 'Imagination Nights', 'Chat', 'English', 'Español', 'Reina-Valera 1909', 'King James Version']);
  const english = new Set(Object.values(en).flatMap(v => typeof v === 'string' ? [v] : Object.values(v as object) as string[]).filter(v => !sameInBoth.has(v)));
  const people = [
    { ...base, language: 'es', journey: 'psalm-nights' }, { ...base, language: 'es', door: 'mindset', journey: 'imagination-nights' },
    { ...base, language: 'en', journey: 'mi-refugio', voice: 'spanish' },
  ];
  const leaks: string[] = [];
  for (const person of people) {
    const pages: Name[] = person.language === 'es' ? ['door', 'age', 'journeys', 'today', 'chat', 'bible', 'nights', 'more', 'settings', 'notFound'] : ['today', 'chat', 'bible', 'nights', 'more'];
    for (const name of pages) {
      const tree = await mount(name, name === 'door' || name === 'age' ? { ...person, door: null, age: null, journey: undefined } : person);
      for (const text of texts(tree)) if (english.has(text) || english.has(text.replace(/\s+›$/, ''))) leaks.push(`${name} (${person.journey}): ${text}`);
    }
  }
  assert.deepEqual(leaks, []);
});

test('the Mindset door never shows the dawn accent (dark mode); God\'s Word does, on night tiles only', async () => {
  (globalThis as any).__pbsScheme = 'dark';
  const dawnIn = (tree: ReactTestRenderer) => tree.root.findAll(n => typeof n.type === 'string' && JSON.stringify(n.props, (k, v) => k === 'children' ? undefined : v).includes('#E0A33E')).length;
  const mindset = { ...base, door: 'mindset', journey: 'imagination-nights' };
  for (const name of ['journeys', 'today', 'nights', 'more', 'settings'] as const) assert.equal(dawnIn(await mount(name, mindset)), 0, name);
  assert.ok(dawnIn(await mount('journeys', { ...base, journey: 'psalm-nights' })) > 0);
});

for (const locale of ['en', 'es'] as const) {
  const person = { ...base, journey: locale === 'es' ? 'mi-refugio' : 'psalm-nights' };
  const copy = locale === 'es' ? es : en;
  test(`Bible ${locale}: John 3:16 from the source, chapter picker, search and saved marks`, async () => {
    const data = gunzipSync(readFileSync(`../content/bible/${locale === 'es' ? 'rv1909' : 'kjv'}_vpl.txt.gz`)).toString();
    const verse = data.match(/^JOH 3:16 (.*)$/m)![1].trim();
    const shownVerse = displayRuns(verse).map(run => run.text).join('');
    const chapter = await mount('bible', person);
    const verseNode = host(chapter, 'Text').find(node => node.props.accessibilityRole === 'button' && textOf(node).replace(/\s+/g, ' ').includes(shownVerse));
    assert.ok(verseNode, 'John 3:16 is present as stored and selectable');
    assert.equal(host(chapter, 'Text').some(node => node.props.style?.fontStyle === 'italic'), locale === 'en');
    await press(chapter, copy['reader.next']);
    assert.deepEqual(calls.at(-1), ['push', { pathname: '/bible/[page]', params: { page: 'chapter', book: 'JOH', chapter: 4, verse: undefined } }]);
    await press(chapter, copy['reader.previous']);
    assert.equal((calls.at(-1)?.[1] as { params: { chapter: number } }).params.chapter, 2);
    await act(async () => verseNode.props.onPress());
    await press(chapter, copy['reader.save']);
    await press(chapter, copy['reader.highlight']);
    assert.ok(local.get('pbs-bible-marks')?.includes('"highlight":true'));
    await press(chapter, copy['share.title']);
    assert.ok(host(chapter, 'SvgText').some(node => node.children.join('') === `${locale === 'es' ? 'Juan' : 'John'} 3:16 · ${locale === 'es' ? 'RV1909' : 'KJV'}`));
    const savedPage = await mount('biblePage', person, { page: 'saved' });
    assert.match(strings(savedPage), /3:16/);
    await press(savedPage, copy['reader.unhighlight']);
    await press(savedPage, copy['reader.unsave']);
    assert.ok(strings(savedPage).includes(copy['reader.emptySaved']));
    const books = await mount('biblePage', person, { page: 'books' });
    await press(books, copy['reader.chooseBook']);
    await press(books, locale === 'es' ? /^Salmos$/ : /^Psalms$/);
    await press(books, /^150$/);
    assert.equal((calls.at(-1)?.[1] as { params: { chapter: number } }).params.chapter, 150);
    const endOfJohn = await mount('biblePage', person, { page: 'chapter', book: 'JOH', chapter: '21' });
    await press(endOfJohn, copy['reader.next']);
    const next = (calls.at(-1)?.[1] as { params: { book: string; chapter: number } }).params;
    assert.equal(next.book, 'ACT');
    assert.equal(next.chapter, 1);
    const startOfActs = await mount('biblePage', person, { page: 'chapter', book: next.book, chapter: '1' });
    await press(startOfActs, copy['reader.previous']);
    const previous = (calls.at(-1)?.[1] as { params: { book: string; chapter: number } }).params;
    assert.equal(previous.book, 'JOH');
    assert.equal(previous.chapter, 21);
    const search = await mount('biblePage', person, { page: 'search' });
    const query = locale === 'es' ? 'corazon' : 'loved world begotten';
    await type(search, query);
    await press(search, copy['reader.search']);
    assert.match(strings(search), locale === 'es' ? /corazón/i : /John 3:16/);
  });

  test(`Daily ${locale}: production hides drafts, declaration makes an image, plans and journal save`, async () => {
    const now = new Date();
    const draft = await mount('dailyPage', person, { page: 'story' });
    assert.ok(strings(draft).includes(copy['daily.noStory']));
    for (let day = 0; day < 7; day++) {
      const date = relativeDate(now, day - now.getDay());
      const displayed = copy[`daily.draft.${day}`];
      const renderStory = (development: boolean) => mount('dailyPage', person, {}, () =>
        <Daily page="story" development={development} now={date} back={() => {}} read={() => {}} />);
      const preview = strings(await renderStory(true));
      assert.ok(preview.includes(displayed));
      assert.deepEqual(faithContentIssues(preview), []);
      const production = strings(await renderStory(false));
      assert.ok(!production.includes(displayed));
      assert.ok(production.includes(copy['daily.noStory']));
    }
    const today = await mount('today', person);
    assert.ok(!strings(today).includes(copy['daily.openStory']));
    const word = await mount('dailyPage', person, { page: 'declaration' });
    assert.ok(strings(word).includes(copy[declaration('faith', now)]));
    if (!strings(word).includes(copy['daily.done'])) await press(word, copy['daily.said']);
    assert.ok(strings(word).includes(copy['daily.done']));
    await press(word, copy['share.title']);
    assert.ok(host(word, 'SvgText').some(node => node.children.join('') === copy['share.brand']));
    // A known PNG stands in for the platform rasterizer. The real component must request capture
    // and render the resulting image, with its download action, before it can be shared.
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jR1sAAAAASUVORK5CYII=';
    (globalThis as any).__pbsCapture = (callback: (data: string) => void) => callback(png);
    await press(word, copy['share.render']);
    assert.equal(host(word, 'Image')[0].props.source.uri, `data:image/png;base64,${png}`);
    assert.ok(strings(word).includes(copy['share.download']));
    const plans = await mount('dailyPage', person, { page: 'plans' });
    const planTitles = ['rest', 'courage', 'mercy'].map(id => copy[`daily.plan.${id}`]);
    assert.deepEqual(host(plans, 'Pressable').filter(node => planTitles.some(title => textOf(node).includes(title))).length, 3);
    await press(plans, copy[locale === 'es' ? 'daily.plan.courage' : 'daily.plan.rest']);
    assert.equal(host(plans, 'Pressable').filter(node => textOf(node) === copy['daily.plan.complete']).length, 7);
    await press(plans, copy['daily.plan.complete']);
    assert.ok(strings(plans).includes(copy['daily.done']));
    const journal = await mount('dailyPage', person, { page: 'journal' });
    const entry = `Test note ${locale}`;
    await type(journal, entry);
    await press(journal, copy['daily.saveNote']);
    assert.equal(JSON.parse(local.get('pbs-daily')!).journal[dateKey(now)], entry);
    const reopened = await mount('dailyPage', person, { page: 'journal' });
    assert.equal(host(reopened, 'TextInput')[0].props.value, entry);
    const completed = await mount('today', person);
    assert.ok(strings(completed).includes(copy['daily.streak'].one.replace('%{count}', '1')));
  });
}

test('a skipped calendar day restarts the count, including at the end of a month', () => {
  const now = new Date(2026, 2, 1);
  const key = (offset: number) => dateKey(relativeDate(now, offset));
  assert.equal(streak([key(0), key(-1), key(-3)], now), 2);
  assert.equal(streak([key(-1)], now), 1);
  assert.equal(streak([key(-2)], now), 0);
});
