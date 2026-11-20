// The real screens and layouts, rendered (test/support/render-build.mjs supplies host primitives and an
// expo-router recorder). Each test drives a screen the way a person would and checks what is shown, what is
// saved and where the app goes next.
import React from 'react';
import { test, beforeEach, mock } from 'node:test';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { strict as assert } from 'node:assert';
import { create, act, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { createDownloads } from '../src/player/downloads';
import { trackTitle, type Track } from '../src/player/library';
import { createPlayer } from '../src/player/player';
import { faithContentIssues, RAISE_WAIT_MS, type Settings } from '../src/model';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const quiet = console.error;
console.error = (...args: unknown[]) => { if (!String(args[0]).includes('react-test-renderer is deprecated')) quiet(...args); };
let saved: string | null = null;
let readFails = false;
let sessionToken = false;
(globalThis as any).__pbsStorage = {
  getItem: async (key: string) => {
    if (readFails) throw new Error('unavailable');
    if (key === 'peace-be-still-chat-token' && sessionToken) return JSON.stringify({ age: 'adult', token: 'test-install' });
    return saved;
  },
  setItem: async (_key: string, value: string) => { saved = value; },
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
  dismissTo: (href: unknown) => calls.push(['dismissTo', href]),
  canGoBack: () => history,
  canDismiss: () => history,
};

// Loaded after the globals above exist.
const { NowPlaying } = require('../src/screens/listen/NowPlaying');
const { tracks: audioTracks } = require('../src/player/usePlayer') as { tracks: Track[] };
const { SettingsProvider, useSettings } = require('../src/settings');
const { i18n } = require('../src/i18n');
const en = require('../src/i18n/en.json');
const es = require('../src/i18n/es.json');
const screens = {
  root: require('../app/_layout'),
  onboarding: require('../app/(onboarding)/_layout').default,
  index: require('../app/index').default,
  door: require('../app/(onboarding)/door').default,
  age: require('../app/(onboarding)/age').default,
  journeys: require('../app/(onboarding)/journeys').default,
  tabs: require('../app/(tabs)/_layout').default,
  today: require('../app/(tabs)/today').default,
  chat: require('../app/(tabs)/chat').default,
  bible: require('../app/(tabs)/bible').default,
  nights: require('../app/(tabs)/nights').default,
  madeForYou: require('../app/made-for-you').default,
  listen: require('../app/listen/[track]').default,
  more: require('../app/(tabs)/more').default,
  settings: require('../app/settings').default,
  notFound: require('../app/+not-found').default,
};
type Name = Exclude<keyof typeof screens, 'root'>;

const base: Settings = { door: 'faith', age: 'adult', ageSetAt: 0, voice: 'plain', language: 'en' };
const store = () => JSON.parse(saved!) as Settings;

const audioBase = 'https://pbs-audio.professionalresourcelibrary.com/';
let publishedTracks: Track[];
beforeEach(() => {
  Object.assign(globalThis, { __pbsPlatform: 'web', __pbsPaid: false, __pbsAudioStop: null });
  publishedTracks = audioTracks;
});
mock.method(globalThis, 'fetch', async (url: string) => {
  assert.equal(url, audioBase + 'manifest.jsonl');
  return new Response(publishedTracks.map(track => JSON.stringify({ ...track, status: 'passed' })).join('\n'));
});
beforeEach(() => { calls = []; history = false; (globalThis as any).__pbsParams = {}; (globalThis as any).__pbsSegments = []; (globalThis as any).__pbsScheme = 'light'; (globalThis as any).__pbsLocale = 'en'; readFails = false; });

async function mount(name: Name, value: object | null = base, params: Record<string, string> = {}) {
  saved = value ? JSON.stringify(value) : null;
  (globalThis as any).__pbsParams = params;
  const Screen = screens[name];
  let tree!: ReactTestRenderer;
  // Like the root layout, a screen is drawn only once the saved settings are read.
  const Ready = () => (useSettings().ready ? <Screen /> : null);
  await act(async () => { tree = create(<SettingsProvider><Ready /></SettingsProvider>); });
  return tree;
}
const texts = (tree: ReactTestRenderer) => tree.root.findAll(n => (n.type as unknown) === 'Text').map(n => n.children.filter(x => typeof x === 'string').join('')).filter(Boolean);
const strings = (tree: ReactTestRenderer) => texts(tree).join(' | ');
const host = (tree: ReactTestRenderer, type: string) => tree.root.findAll(n => (n.type as unknown) === type);
const textOf = (node: ReactTestInstance) => node.findAll(n => (n.type as unknown) === 'Text').map(t => t.children.filter(x => typeof x === 'string').join('')).join(' ');
async function press(tree: ReactTestRenderer, text: string | RegExp) {
  const match = (s: string) => typeof text === 'string' ? s.includes(text) : text.test(s);
  const target = host(tree, 'Pressable').find(n => match(textOf(n)));
  assert.ok(target, `No button "${text}" in: ${strings(tree)}`);
  assert.ok(!target.props.disabled, `Button "${text}" is disabled`);
  await act(async () => target.props.onPress());
}
async function type(tree: ReactTestRenderer, value: string) {
  await act(async () => host(tree, 'TextInput')[0].props.onChangeText(value));
}
const thisYear = new Date().getFullYear();
const radios = (tree: ReactTestRenderer) => host(tree, 'Pressable').filter(n => n.props.role === 'radio');
const checked = (tree: ReactTestRenderer) => radios(tree).filter(n => n.props['aria-checked'] === true).map(textOf);

test('the onboarding steps have one guard: a deep link never skips a step, and once onboarded they open only from Settings', async () => {
  const at = async (step: string, value: object | null, params: Record<string, string> = {}) => {
    (globalThis as any).__pbsSegments = ['(onboarding)', step];
    return host(await mount('onboarding', value, params), 'Redirect')[0]?.props.href;
  };
  const done = { ...base, journey: 'psalm-nights' };
  assert.equal(await at('journeys', null), '/door');
  assert.equal(await at('age', null), '/door');
  assert.equal(await at('journeys', { ...base, age: null }), '/age');
  assert.equal(await at('door', { ...base, age: null }), undefined);
  assert.equal(await at('journeys', base), undefined);
  for (const step of ['door', 'age', 'journeys']) assert.equal(await at(step, done), '/today', step);
  assert.equal(await at('door', done, { change: '1' }), undefined);
  assert.equal(await at('journeys', done, { door: 'mindset', change: '1' }), undefined);
  assert.equal(await at('age', done, { correct: '1' }), undefined);
});

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
  assert.equal(radios(tree).length, 13);
  assert.deepEqual(checked(tree), []);
  await press(tree, 'Skip');
  assert.deepEqual(checked(tree), ['Skip']);
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
  // The wait is said once (the date replaces the rule) and in muted ink: wine is only for a wrong year.
  assert.doesNotMatch(strings(early), /once, 7 days after/);
  const wait = host(early, 'Text').find(n => /older age group from/.test(textOf(n)) && n.props.style)!;
  assert.notEqual(JSON.stringify(wait.props.style).includes('#A3303A'), true);
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
  assert.deepEqual(checked(tree).map(s => s.split(' · ')[0]), ['Hush Harbor']);
  await press(tree, 'Mi Refugio');
  assert.deepEqual(checked(tree).map(s => s.split(' · ')[0]), ['Mi Refugio']);
  await press(tree, 'Hush Harbor');
  await press(tree, 'Start Hush Harbor');
  assert.equal(store().journey, 'hush-harbor');
  assert.equal(store().voice, 'church');
  // Start only saves; the onboarding layout's redirect (a replace) moves her to Today, so nothing is pushed
  // or dismissed that back could return to.
  assert.deepEqual(calls, []);
  (globalThis as any).__pbsSegments = ['(onboarding)', 'journeys'];
  assert.equal(host(await mount('onboarding', store()), 'Redirect')[0].props.href, '/today');
});

test('a teen\'s picker opens on Young Faith; a teen who picks Hush Harbor still gets the teen voice', async () => {
  const teen = await mount('journeys', { ...base, age: 'teen', voice: 'teen' });
  assert.ok(host(teen, 'Pressable').some(n => textOf(n) === 'Start Young Faith  ›'));
  await press(teen, 'Hush Harbor');
  await press(teen, 'Start Hush Harbor');
  assert.equal(store().voice, 'teen');
});

test('a child sees no chat-led journey, and Start names the first one she can pick', async () => {
  const tree = await mount('journeys', { ...base, age: 'child' });
  assert.doesNotMatch(strings(tree), /Hush Harbor|Mi Refugio|Young Faith|13 to 17/);
  assert.ok(host(tree, 'Pressable').some(n => textOf(n) === 'Start Psalm Nights  ›'));
  const es = strings(await mount('journeys', { ...base, age: 'child', language: 'es' }));
  assert.doesNotMatch(es, /Young Faith|13 a 17/);
});

test('the Mindset picker asks the scripture question after its cards, with a switch, and keeps the answer', async () => {
  const tree = await mount('journeys', { ...base, door: 'mindset' });
  const order = texts(tree);
  assert.ok(order.indexOf('Weave scripture in') > order.findIndex(s => s.startsWith('Morning Word')));
  // The whole row is the one switch: role, state and label on it, and no second switch control inside.
  assert.equal(host(tree, 'Switch').length, 0);
  const toggles = host(tree, 'Pressable').filter(n => n.props.role === 'switch');
  assert.equal(toggles.length, 1);
  assert.equal(toggles[0].props['aria-label'], 'Weave scripture in');
  assert.equal(toggles[0].props['aria-checked'], false);
  await act(async () => toggles[0].props.onPress());
  assert.equal(host(tree, 'Pressable').find(n => n.props.role === 'switch')!.props['aria-checked'], true);
  await press(tree, 'Start Imagination Nights');
  assert.equal(store().scripture, true); assert.equal(store().journey, 'imagination-nights');
});

test('changing the door from Settings keeps the old journey until a new one is started', async () => {
  const tree = await mount('door', { ...base, journey: 'psalm-nights' });
  await press(tree, 'With mindset');
  assert.equal(store().door, 'faith');
  assert.deepEqual(calls, [['push', { pathname: '/journeys', params: { door: 'mindset', change: '1' } }]]);
  calls = [];
  const picker = await mount('journeys', { ...base, journey: 'psalm-nights' }, { door: 'mindset', change: '1' });
  await press(picker, 'Start Imagination Nights');
  assert.equal(store().door, 'mindset'); assert.equal(store().journey, 'imagination-nights');
  assert.deepEqual(calls, [['dismissTo', '/today']]);
  const settings = await mount('settings', { ...base, journey: 'psalm-nights' });
  calls = [];
  await press(settings, 'Your door');
  assert.deepEqual(calls, [['push', { pathname: '/door', params: { change: '1' } }]]);
});

test('tabs follow the door and the age (expo-router Tabs, hidden with href null)', async () => {
  const shown = async (value: object) => host(await mount('tabs', value), 'Tabs.Screen').filter(n => n.props.options.href !== null).map(n => n.props.options.title);
  assert.deepEqual(await shown({ ...base, journey: 'psalm-nights' }), ['Today', 'Chat', 'Bible', 'Nights', 'More']);
  assert.deepEqual(await shown({ ...base, age: 'child', journey: 'psalm-nights' }), ['Today', 'Bible', 'Nights', 'More']);
  assert.deepEqual(await shown({ ...base, door: 'mindset', journey: 'imagination-nights' }), ['Today', 'Chat', 'Nights', 'More']);
  assert.deepEqual(await shown({ ...base, journey: 'mi-refugio' }), ['Hoy', 'Chat', 'Biblia', 'Noches', 'Más']);
});

test('the tab bar is tall enough for the icon and the whole label line, and leaves the inset padding to the navigator', async () => {
  const options = host(await mount('tabs', { ...base, journey: 'psalm-nights' }), 'Tabs')[0].props.screenOptions;
  const label = options.tabBarLabelStyle;
  assert.ok(label.lineHeight >= label.fontSize * 1.3);
  // The navigator's tab: 5 pt padding, a 28 pt icon box, the label, 5 pt padding (round 4 clipped at 66 - 16 pt).
  assert.ok(options.tabBarStyle.height >= 5 + 28 + label.lineHeight + 5, String(options.tabBarStyle.height));
  for (const key of ['paddingTop', 'paddingBottom']) assert.equal(options.tabBarStyle[key], undefined, key);
});

test('opening the tabs records today once, keeping only this week', async () => {
  const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const now = new Date();
  await mount('tabs', { ...base, journey: 'psalm-nights', opened: ['2020-01-01'] });
  assert.deepEqual(store().opened, [day(now)]);
});

test('a typed link cannot open a hidden tab', async () => {
  assert.equal(host(await mount('chat', { ...base, age: 'child', journey: 'psalm-nights' }), 'Redirect')[0].props.href, '/today');
  assert.equal(host(await mount('bible', { ...base, door: 'mindset', journey: 'imagination-nights' }), 'Redirect')[0].props.href, '/today');
  assert.match(strings(await mount('chat', { ...base, journey: 'psalm-nights' })), /One free conversation a day/);
});

test('Today has the date, the week and the three items for the door, with no welcome filler', async () => {
  const faith = await mount('today', { ...base, journey: 'psalm-nights' });
  const shown = strings(faith);
  assert.match(shown, /1 day this week/);
  assert.equal(host(faith, 'View').filter(n => n.props.testID === 'day-opened').length, 1);
  assert.match(shown, /Today's declaration.*Today's story.*Tonight: Psalm Nights/);
  assert.doesNotMatch(shown, /WELCOME|Welcome|Good to have you/);
  await press(faith, 'Open');
  assert.deepEqual(calls, [['navigate', '/nights']]);
  const mindset = strings(await mount('today', { ...base, door: 'mindset', journey: 'imagination-nights' }));
  assert.match(mindset, /Your scene.*Tonight: Imagination Nights/);
  assert.doesNotMatch(mindset, /Psalm|Bible/);
});

test('the week count is the days she opened the app this week, with those dots filled', async () => {
  const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const now = new Date();
  const week = Array.from({ length: 7 }, (_, i) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + i));
  const other = week.find(d => day(d) !== day(now))!;
  const tree = await mount('today', { ...base, journey: 'psalm-nights', opened: [day(other), day(now)] });
  assert.match(strings(tree), /2 days this week/);
  assert.equal(host(tree, 'View').filter(n => n.props.testID === 'day-opened').length, 2);
  assert.equal(host(tree, 'View').find(n => n.props.role === 'img')!.props['aria-label'], '2 days this week');
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
  assert.deepEqual(checked(adult), ['Black church', 'English']);
  assert.ok(radios(adult).every(n => typeof n.props['aria-checked'] === 'boolean'));
  const teen = strings(await mount('settings', { ...base, age: 'teen', voice: 'teen', journey: 'psalm-nights' }));
  assert.match(teen, /Teen/); assert.doesNotMatch(teen, /Plain modern/);
  const child = strings(await mount('settings', { ...base, age: 'child', journey: 'psalm-nights' }));
  assert.doesNotMatch(child, /Chat voice|Plain modern|Black church/);
});

test('Mi Refugio: the screens inside it are Spanish, Settings keeps the app language, and the saved language is untouched', async () => {
  const value = { ...base, journey: 'mi-refugio', voice: 'spanish' };
  assert.match(strings(await mount('today', value)), /La declaración de hoy/);
  // Psalm Nights inside Mi Refugio is the Spanish one (whispered Salmos), named in Spanish.
  assert.match(strings(await mount('today', value)), /Esta noche: Salmos para dormir/);
  assert.match(strings(await mount('more', value)), /Ajustes/);
  const settings = strings(await mount('settings', value));
  assert.match(settings, /Settings/);
  // The way back is named as the tab bar under it says it.
  assert.match(settings, /←  Más/);
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
    ['today', person], ['bible', person], ['nights', person], ['more', person], ['settings', person], ['notFound', person],
  ];
  if (age !== 'child') pages.push(['chat', person]);
  const out: Array<[string, string]> = [];
  // The front door names both doors; everything on it except the Mindset door's own name is checked.
  for (const [name, value, params] of pages) out.push([`${name} ${language} ${age}`, strings(await mount(name, value, params)).replace(/With mindset & imagination|Con mente e imaginación/g, '')]);
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
  const sameInBoth = new Set(['Peace Be Still', 'Hush Harbor', 'Mi Refugio', 'Biblia y Chat en Español', 'Morning Word', 'Young Faith', 'Imagination Nights', 'Chat', 'English', 'Español', 'Español (Mi Refugio)']);
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

function testPlayer(track: Track, baseUrl: string | null = audioBase, position = 0,
  fetchHash: () => Promise<string> = async () => track.sha256) {
  let at = 0;
  let source: string | undefined;
  let playing = false;
  let listener: ((status: { playing: boolean; isLoaded: boolean; didJustFinish: boolean }) => void) | undefined;
  const audio = {
    load: (uri: string) => { source = uri; at = 0; },
    play() { playing = true; },
    pause() { playing = false; },
    isLoaded: true,
    get currentTime() { return at; },
    volume: 1,
    async seekTo(seconds: number) { at = seconds; },
    onStatus: (notify: typeof listener) => {
      listener = notify;
      return () => { listener = undefined; };
    },
    dispose() {},
  };
  const files = new Map<string, string>();
  const downloads = createDownloads({
    exists: name => files.has(name),
    uri: name => 'file:///audio/' + name,
    async download(_url, name) { files.set(name, await fetchHash()); },
    async sha256(name) { return files.get(name)!; },
    async move(from, to) { files.set(to, files.get(from)!); files.delete(from); },
    remove: name => { files.delete(name); },
  });
  const store = {
    getItem: async () => JSON.stringify({ positionSeconds: position }),
    setItem: async () => undefined,
    removeItem: async () => undefined,
  };
  const player = createPlayer({ audio, downloads, store, lang: 'en', baseUrl });
  Object.assign(globalThis, { __pbsPlayer: player });
  return {
    ...player, position: () => at, source: () => source,
    move(seconds: number) { at = seconds; listener?.({ playing, isLoaded: true, didJustFinish: false }); },
  };
}

test('the Nights tab opens real manifest Psalms, Bible chapters and Hush Harbor stories', async () => {
  const person = { ...base, journey: 'psalm-nights' };
  const tree = await mount('nights', person);
  const psalm = audioTracks.find(track => track.ref === 'PSA 23')!;
  const bible = audioTracks.find(track => track.kind === 'bible')!;
  const story = audioTracks.find(track => track.ref.startsWith('content/stories/hush-harbor/'))!;
  assert.ok(psalm && bible && story);
  const open = async (title: string, track: Track) => {
    await press(tree, title);
    assert.deepEqual(calls.pop(), ['push', { pathname: '/listen/[track]', params: { track: track.sha256 } }]);
  };
  const psalmShelf = host(tree, 'Pressable').find(node => textOf(node).startsWith(en['journey.psalmNights.name'] + ' '));
  const count = audioTracks.filter(track => track.kind === 'psalms' && track.lang === 'en').length;
  assert.ok(psalmShelf && textOf(psalmShelf).includes(i18n.t('listen.whisperedNights', { locale: 'en', count })));
  const cardRow = psalmShelf.findAll(node => (node.type as unknown) === 'View' && node.props.style?.flexDirection === 'row')[0];
  assert.ok(cardRow, 'The shelf details and chevron should share a horizontal row');
  assert.ok(textOf(cardRow).endsWith(' ›'));
  assert.equal(psalmShelf.props['aria-expanded'], false);
  await press(tree, en['journey.psalmNights.name']);
  assert.equal(psalmShelf.props['aria-expanded'], true);
  await open(trackTitle(psalm, 'en'), psalm);
  await press(tree, en['listen.bibleByBook']);
  await press(tree, trackTitle(bible, 'en').replace(/ \d+$/, ''));
  await open(trackTitle(bible, 'en'), bible);
  await press(tree, en['journey.hushHarbor.subtitle']);
  await open(trackTitle(story, 'en'), story);
  assert.deepEqual(faithContentIssues(strings(tree)), []);
  assert.doesNotMatch(strings(tree), /\.m4a|\.json/);
});

test('the canonical catalog plays Psalm 1 and disables missing or outdated uploads', async () => {
  const track = audioTracks.find(track => track.ref === 'PSA 4' && track.lang === 'en')!;
  const outdated = audioTracks.find(track => track.ref === 'PSA 23' && track.lang === 'en')!;
  const available = audioTracks.find(track => track.ref === 'PSA 1' && track.lang === 'en')!;
  assert.ok(track && outdated && available);
  publishedTracks = [available, { ...outdated, sha256: track.sha256 }];
  const person = { ...base, journey: 'psalm-nights' };
  const shelf = await mount('nights', person);
  await press(shelf, en['journey.psalmNights.name']);
  try {
    await press(shelf, /^Psalm 1 ›$/);
    assert.deepEqual(calls.pop(), ['push', { pathname: '/listen/[track]', params: { track: available.sha256 } }]);
    const playable = testPlayer(available);
    const screen = await mount('listen', person, { track: available.sha256 });
    try {
      await press(screen, en['listen.play']);
      assert.ok(texts(screen).includes(en['listen.pause']));
      assert.equal(playable.source(), audioBase + available.file);
    } finally {
      await act(async () => screen.unmount());
      await playable.dispose();
    }
    for (const unavailable of [track, outdated]) {
      const title = trackTitle(unavailable, 'en');
      assert.ok(host(shelf, 'View').some(node => textOf(node) === `${title} ${en['listen.notReady']}`));
      assert.ok(!host(shelf, 'Pressable').some(node => textOf(node).includes(title + ' ') || textOf(node) === title));
      const player = testPlayer(unavailable);
      const screen = await mount('listen', person, { track: unavailable.sha256 });
      try {
        assert.ok(texts(screen).includes(en['listen.audioNotReady']));
        assert.equal(host(screen, 'Pressable').find(node => textOf(node) === en['listen.play'])?.props.disabled, true);
        for (const label of [en['listen.back15'], en['listen.forward15']]) {
          assert.equal(host(screen, 'Pressable').find(node => node.props.accessibilityLabel === label)?.props.disabled, true);
        }
        if (unavailable === track) {
          const stored = storedVerse('PSA', 4, 1);
          const supplied = stored.match(/\[([^\]]+)\]/)?.[1];
          assert.ok(supplied, 'Psalm 4 contains translator-supplied words');
          const italic = host(screen, 'Text').find(node => node.children.join('') === supplied);
          assert.equal(italic?.props.style?.fontFamily, 'LibreCaslonText_400Regular_Italic');
          assert.equal(italic?.parent?.children.map(child => typeof child === 'string' ? child : child.children.join('')).join(''),
            stored.replace(/^¶\s*/, '').replace(/[\[\]]/g, ''));
        }
      } finally {
        await act(async () => screen.unmount());
        await player.dispose();
      }
    }
  } finally {
    await act(async () => shelf.unmount());
  }
});

test('Spanish and Mindset shelves show their own library and the current availability', async () => {
  const spanish = await mount('nights', { ...base, journey: 'mi-refugio', voice: 'spanish' });
  assert.ok(texts(spanish).includes(es['tabs.nights']));
  assert.ok(texts(spanish).includes(es['journey.miRefugio.name']));
  assert.ok(texts(spanish).includes(es['listen.emptyShelf']));
  assert.ok(!strings(spanish).includes(en['journey.hushHarbor.name']));
  for (const language of ['en', 'es'] as const) {
    const locale = language === 'es' ? es : en;
    const mindset = await mount('nights', { ...base, language, door: 'mindset', journey: 'imagination-nights' });
    assert.ok(texts(mindset).includes(locale['journey.imaginationNights.name']));
    assert.ok(texts(mindset).includes(locale['listen.emptyShelf']));
    assert.ok(!strings(mindset).includes(locale['listen.bibleByBook']));
  }
});

test('the player route guards onboarding, door and language even on direct links', async () => {
  const psalm = audioTracks.find(track => track.kind === 'psalms')!;
  const params = { track: psalm.sha256 };
  assert.equal(host(await mount('listen', null, params), 'Redirect')[0].props.href, '/door');
  for (const person of [
    { ...base, journey: 'imagination-nights', door: 'mindset' },
    { ...base, journey: 'mi-refugio', voice: 'spanish' },
  ]) {
    const tree = await mount('listen', person, params);
    assert.ok(!texts(tree).includes(trackTitle(psalm, 'en')));
    assert.equal(host(tree, 'Modal').length, 0);
    assert.equal(host(tree, 'Pressable').length, 1);
  }
});

test('Now Playing reports the named configuration stop, with AI disclosure and disabled playback', async () => {
  const track = audioTracks.find(track => track.kind === 'psalms')!;
  const player = testPlayer(track, null);
  (globalThis as any).__pbsAudioStop = 'CONFIG_AUDIO_BASE_URL';
  const tree = await mount('listen', { ...base, journey: 'psalm-nights' }, { track: track.sha256 });
  assert.ok(strings(tree).includes(en['listen.aiVoice']));
  assert.ok(texts(tree).includes(en['listen.audioNotReady']));
  assert.equal(host(tree, 'Pressable').find(node => textOf(node) === en['listen.play'])?.props.disabled, true);
  assert.ok(!strings(tree).includes('CONFIG_AUDIO_BASE_URL'));
  assert.deepEqual(faithContentIssues(strings(tree)), []);
  await act(async () => tree.unmount());
  await player.dispose();
});

function storedVerse(book: string, chapter: number, verse: number) {
  const db = new DatabaseSync('src/bible/data/kjv.db', { readOnly: true });
  try {
    const row = db.prepare('SELECT text FROM verses WHERE book = ? AND chapter = ? AND verse = ?').get(book, chapter, verse);
    assert.equal(typeof row?.text, 'string');
    return String(row?.text);
  } finally {
    db.close();
  }
}

test('Now Playing restores a saved position and renders pause, continue and the timer sheet', async () => {
  const track = audioTracks.find(track => track.ref === 'PSA 23')!;
  const player = testPlayer(track, audioBase, 12);
  const tree = await mount('listen', { ...base, journey: 'psalm-nights' }, { track: track.sha256 });
  try {
    assert.ok(texts(tree).includes(en['listen.paidDownload']));
    assert.ok(!texts(tree).includes(en['listen.download']));
    await press(tree, new RegExp('^' + en['listen.play'] + '$'));
    assert.equal(player.position(), 12);
    await press(tree, new RegExp('^' + en['listen.pause'] + '$'));
    assert.ok(texts(tree).includes(en['listen.resume']));
    await press(tree, en['listen.resume']);
    assert.equal(player.position(), 12);
    assert.ok(texts(tree).includes(storedVerse('PSA', 23, 2)));
    assert.ok(strings(tree).includes('Psalm 23:2 · KJV'));
    assert.ok(texts(tree).includes(en['listen.psalmAllowance']));
    assert.ok(texts(tree).includes('0:12'));
    assert.ok(texts(tree).includes(`${Math.floor(track.seconds / 60)}:${String(Math.floor(track.seconds % 60)).padStart(2, '0')}`));
    assert.ok(texts(tree).includes(i18n.t('listen.timerSummary', { locale: 'en', setting: en['listen.timerOff'] })));
    await press(tree, '+15');
    assert.equal(player.position(), 27);
    assert.ok(texts(tree).includes('0:27'));
    assert.equal(host(tree, 'View').find(node => node.props.accessibilityRole === 'progressbar')?.props.accessibilityValue.now,
      Math.floor(27 / track.seconds * 100));
    await press(tree, '−15');
    assert.equal(player.position(), 12);
    await press(tree, en['listen.timer']);
    assert.equal(host(tree, 'Modal').length, 1);
    assert.ok(texts(tree).includes(en['listen.timerFade']));
    assert.ok(texts(tree).includes('60 min'));
    await press(tree, /^30 min$/);
    assert.equal(host(tree, 'Modal').length, 0);
    assert.ok(texts(tree).includes(i18n.t('listen.timerSummary', { locale: 'en', setting: '30 min' })));
    assert.ok(player.getState().sleepEndsAt);
    await press(tree, en['listen.timer']);
    await press(tree, new RegExp('^' + en['listen.timerOff'] + '$'));
    assert.equal(player.getState().sleepEndsAt, null);
  } finally {
    await act(async () => tree.unmount());
    await player.dispose();
  }
});

test('a paid listener sees download in progress, failure and successful retry', async () => {
  const track = audioTracks.find(track => track.kind === 'bible')!;
  let finish: ((hash: string) => void) | undefined;
  const player = testPlayer(track, audioBase, 0, () => new Promise(resolve => { finish = resolve; }));
  (globalThis as any).__pbsPlatform = 'ios';
  (globalThis as any).__pbsPaid = true;
  const tree = await mount('listen', { ...base, journey: 'psalm-nights' }, { track: track.sha256 });
  try {
    await press(tree, new RegExp('^' + en['listen.download'] + '$'));
    assert.ok(texts(tree).includes(en['listen.downloading']));
    await act(async () => finish?.('wrong hash'));
    assert.ok(texts(tree).includes(en['listen.downloadFailed']));
    await press(tree, new RegExp('^' + en['listen.download'] + '$'));
    await act(async () => finish?.(track.sha256));
    const saved = host(tree, 'Pressable').find(node => textOf(node) === en['listen.downloaded']);
    assert.equal(saved?.props.disabled, true);
    assert.ok(!texts(tree).includes(en['listen.downloadFailed']));
  } finally {
    await act(async () => tree.unmount());
    await player.dispose();
  }
});

test('Hush Harbor cues follow the real pause positions and the Spanish player renders its timer', async () => {
  const track = audioTracks.find(track => track.ref === 'content/stories/hush-harbor/core-001-peace-be-still.json')!;
  const player = testPlayer(track);
  const english = await mount('listen', { ...base, journey: 'hush-harbor' }, { track: track.sha256 });
  const story = JSON.parse(readFileSync('../' + track.ref, 'utf8'));
  const openingScripture = story.blocks.find((block: { type: string }) => block.type === 'scripture');
  assert.equal(openingScripture.ref, 'MAR 4:37');
  assert.ok(texts(english).includes(storedVerse('MAR', 4, 37).replace(/^¶\s*/, '')));
  assert.ok(strings(english).includes(openingScripture.label + ' · KJV'));
  assert.ok(track.responsePauses, 'the real story carries both audio pause positions');
  const [first, second] = track.responsePauses;
  await press(english, en['listen.play']);
  assert.ok(!texts(english).includes('+15') && !texts(english).includes('−15'));
  await player.skip(15);
  assert.equal(player.position(), 0);
  const expectCue = async (position: number, cue: string | null) => {
    await act(async () => player.move(position));
    assert.deepEqual(
      texts(english).filter(text => text === en['listen.responseFirst'] || text === en['listen.responseSecond']),
      cue === null ? [] : [cue],
    );
  };
  await expectCue(first - 0.25, null);
  await expectCue(first, en['listen.responseFirst']);
  await expectCue(first + 3, null);
  await expectCue(second, en['listen.responseSecond']);
  await expectCue(second + 3, null);
  assert.deepEqual(faithContentIssues(strings(english)), []);
  await act(async () => english.unmount());

  // The production catalog has no Spanish story audio yet. Use the real story's media
  // metadata at the component boundary to verify its Spanish controls and response copy.
  saved = JSON.stringify({ ...base, language: 'es', journey: 'mi-refugio' });
  const Ready = () => useSettings().ready ? <NowPlaying track={track} close={() => undefined} /> : null;
  let spanish!: ReactTestRenderer;
  await act(async () => { spanish = create(<SettingsProvider><Ready /></SettingsProvider>); });
  try {
    await act(async () => player.move(first));
    assert.ok(texts(spanish).includes(es['listen.responseFirst']));
    assert.ok(strings(spanish).includes(es['listen.aiVoice']));
    await press(spanish, es['listen.timer']);
    assert.equal(host(spanish, 'Modal').length, 1);
    assert.ok(texts(spanish).includes(es['listen.timerFade']));
    assert.deepEqual(faithContentIssues(strings(spanish)), []);
  } finally {
    await act(async () => spanish.unmount());
    await player.dispose();
  }
});


test('the Nights entry leads to the subscription gate, and children cannot open a direct link', async () => {
  const person = { ...base, journey: 'psalm-nights' };
  const nights = await mount('nights', person);
  await press(nights, 'Made for you');
  assert.deepEqual(calls.pop(), ['push', '/made-for-you']);
  const locked = await mount('madeForYou', person);
  assert.match(strings(locked), /subscription/i);
  assert.equal(host(locked, 'TextInput').length, 0);
  await press(locked, /subscription plans/i);
  assert.deepEqual(calls.pop(), ['push', '/paid']);
  const child = await mount('madeForYou', { ...person, age: 'child' });
  assert.equal(host(child, 'Redirect')[0]?.props.href, '/nights');
  const spanish = await mount('madeForYou', { ...person, journey: 'mi-refugio' });
  assert.match(strings(spanish), /suscripción/i);
  assert.equal(host(spanish, 'TextInput').length, 0);
});

test('paid sessions render requests, delay, expiry, shelf and shared playback in both languages', async t => {
  sessionToken = true;
  t.after(() => { sessionToken = false; });
  const { MadeForYouScreen } = require('../src/madeForYou/Screen') as typeof import('../src/madeForYou/Screen');
  for (const lang of ['en', 'es'] as const) {
    const faith = lang === 'es';
    const context = { age: 'adult', lang, door: faith ? 'faith' : 'mindset', kind: faith ? 'psalm' : 'imagination' } as const;
    const ready = { id: 'night-one', day: '2026-11-20', path: 'private/session.m4a', seconds: 650, sha256: 'a'.repeat(64) };
    const stream = 'https://private.example/session.m4a?signature=fixture';
    const player = testPlayer(audioTracks[0], null);
    type Api = NonNullable<React.ComponentProps<typeof MadeForYouScreen>['api']>;
    let shelf: Awaited<ReturnType<Api['list']>> = { ready: [], pending: null, expired: false };
    let fail = true;
    let posted: unknown;
    const fetchMock = mock.method(globalThis, 'fetch', async (input: string, init: RequestInit) => {
      const url = new URL(input);
      assert.equal(url.pathname, '/api/made-for-you');
      assert.equal(url.searchParams.get('kind'), context.kind);
      assert.equal(url.searchParams.get('lang'), lang);
      assert.equal(new Headers(init.headers).get('authorization'), 'Bearer test-install');
      if (url.searchParams.has('play')) {
        assert.equal(url.searchParams.get('play'), ready.id);
        return Response.json({ url: stream });
      }
      return Response.json(shelf);
    });
    const api: Api = {
      async list() {
        if (fail) throw new Error('unavailable');
        return shelf;
      },
      async submit(actual, note) {
        posted = [actual, note];
        shelf = { ready: [], pending: { id: ready.id, day: ready.day, delayed: false, retrying: false }, expired: false };
        return { status: 'pending' as const, ...shelf.pending! };
      },
      async play() { throw new Error('The shelf must open the listen route'); },
    };
    let tree!: ReactTestRenderer;
    let opened: string | undefined;
    await act(async () => {
      tree = create(<MadeForYouScreen paid context={context} close={() => {}} plans={() => {}}
        play={row => { opened = row.id; }} api={api} />);
    });
    const translated = faith
      ? { retry: /volver a consultar/i, request: /preparar mi sesión/i, pending: /esta noche/i, error: /no pudimos/i,
          play: es['listen.play'], pause: es['listen.pause'], ai: es['listen.aiVoice'], close: es['listen.close'] }
      : { retry: /check again/i, request: /make my session/i, pending: /ready tonight/i, error: /couldn’t load/i,
          play: en['listen.play'], pause: en['listen.pause'], ai: en['listen.aiVoice'], close: en['listen.close'] };
    assert.match(strings(tree), translated.error);
    assert.equal(host(tree, 'TextInput').length, 0);
    fail = false;
    await press(tree, translated.retry);
    assert.equal(host(tree, 'TextInput')[0].props.maxLength, 500);
    assert.match(strings(tree), /IA|AI/);
    const note = faith ? 'La lluvia' : 'Rain at the window';
    await type(tree, note);
    await press(tree, translated.request);
    assert.deepEqual(posted, [context, note]);
    assert.match(strings(tree), translated.pending);
    assert.equal(host(tree, 'TextInput').length, 0);
    shelf = { ready: [], pending: { id: ready.id, day: ready.day, delayed: true, retrying: false }, expired: false };
    await press(tree, translated.retry);
    assert.doesNotMatch(strings(tree), translated.pending);
    assert.match(strings(tree), faith ? /tardando/ : /taking longer/);
    shelf = { ready: [], pending: { id: ready.id, day: ready.day, delayed: true, retrying: true }, expired: false };
    await press(tree, translated.retry);
    assert.match(strings(tree), faith ? /intentaremos de nuevo/ : /we’ll try again/i);
    assert.equal(host(tree, 'TextInput').length, 0);
    shelf = { ready: [], pending: null, expired: true };
    await press(tree, translated.retry);
    assert.match(strings(tree), faith ? /se borró/ : /note was erased/);
    assert.equal(host(tree, 'TextInput').length, 1);
    await type(tree, note);
    await press(tree, translated.request);
    shelf = { ready: [ready], pending: null, expired: false };
    await press(tree, translated.retry);
    await press(tree, /20/);
    assert.equal(opened, ready.id);
    Object.assign(globalThis, { __pbsPlatform: 'ios', __pbsPaid: true });
    const person = { ...base, door: context.door, language: lang, journey: faith ? 'mi-refugio' : 'imagination-nights' };
    const listen = await mount('listen', person, { track: `made-for-you-${opened}` });
    assert.ok(texts(listen).includes(translated.ai));
    assert.ok(texts(listen).includes('0:00'));
    assert.ok(texts(listen).includes('10:50'));
    await press(listen, translated.play);
    assert.equal(player.source(), stream);
    assert.ok(player.getState().playing);
    await press(listen, '+15');
    assert.equal(player.position(), 15);
    await press(listen, '−15');
    assert.equal(player.position(), 0);
    await press(listen, translated.pause);
    assert.ok(!player.getState().playing);
    const locale = faith ? es : en;
    await press(listen, locale['listen.timer']);
    assert.ok(texts(listen).includes(locale['listen.timerFade']));
    await press(listen, locale['listen.minutes'].replace('%{minutes}', '15'));
    assert.ok(player.getState().sleepEndsAt);
    await press(listen, translated.close);
    assert.deepEqual(calls.pop(), ['replace', '/made-for-you']);
    const section = strings(listen);
    if (faith) assert.deepEqual(faithContentIssues(section), []);
    else assert.doesNotMatch(section, /psalm|bible|scripture/i);
    await act(async () => { listen.unmount(); tree.unmount(); await player.dispose(); });
    fetchMock.mock.restore();
  }
});

test('web preview routes render paid states and play a public fixture without calling the paid API', async t => {
  const previous = process.env.EXPO_PUBLIC_PBS_PREVIEW;
  process.env.EXPO_PUBLIC_PBS_PREVIEW = '1';
  const location = Object.getOwnPropertyDescriptor(globalThis, 'location');
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { origin: 'https://preview.example' } });
  t.after(() => {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_PBS_PREVIEW;
    else process.env.EXPO_PUBLIC_PBS_PREVIEW = previous;
    if (location) Object.defineProperty(globalThis, 'location', location);
    else Reflect.deleteProperty(globalThis, 'location');
  });
  const fetchMock = t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected preview fetch'); });
  const person = { ...base, journey: 'mi-refugio' };
  const form = await mount('madeForYou', person, { state: 'form' });
  assert.equal(host(form, 'TextInput').length, 1);
  await type(form, 'Quiero descansar');
  await press(form, /preparar mi sesión/i);
  assert.match(strings(form), /vista previa/i);
  assert.equal(host(form, 'TextInput')[0].props.value, '');
  const pending = await mount('madeForYou', person, { state: 'pending' });
  assert.match(strings(pending), /esta noche/i);
  assert.equal(host(pending, 'TextInput').length, 0);
  const error = await mount('madeForYou', person, { state: 'error' });
  assert.ok(host(error, 'Text').some(node => node.props.accessibilityRole === 'alert'));

  const ready = await mount('madeForYou', person, { state: 'ready' });
  await press(ready, /20/);
  const navigation = calls.pop();
  assert.deepEqual(navigation, ['push', { pathname: '/listen/[track]', params: { track: 'made-for-you-preview-session' } }]);
  const player = testPlayer(audioTracks[0], null);
  const listen = await mount('listen', person, { track: 'made-for-you-preview-session' });
  await press(listen, es['listen.play']);
  assert.equal(player.source(), 'https://preview.example/made-for-you-preview/psalm-es.mp3');
  assert.ok(readFileSync('public/made-for-you-preview/psalm-es.mp3').length > 0);
  assert.ok(player.getState().playing);

  await act(async () => {
    for (const tree of [form, pending, error, ready, listen]) tree.unmount();
    await player.dispose();
  });
  assert.equal(fetchMock.mock.callCount(), 0);
});
