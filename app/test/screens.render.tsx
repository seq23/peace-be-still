// The real screens and layouts, rendered (test/support/render-build.mjs supplies host primitives and an
// expo-router recorder). Each test drives a screen the way a person would and checks what is shown, what is
// saved and where the app goes next.
import React from 'react';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { gunzipSync } from 'node:zlib';
import { displayRuns, formatReference, parseReference } from '../src/bible/core';
import { mindsetDeclarations, mindsetTopics, plans } from '../src/screens/daily/content';
import { byTopic, dailyDeclaration, pastStories, shelf, storyFor, tellingFor, topics } from '../src/content';
import type { DailyPage } from '../src/screens/daily/Daily';
import { test, beforeEach, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import { create, act, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import products from '../src/config/products.json';
import { createDownloads } from '../src/player/downloads';
import { trackTitle, type Track } from '../src/player/library';
import { createPlayer } from '../src/player/player';
import { dayKey, faithContentIssues, RAISE_WAIT_MS, type JourneyId, type Settings } from '../src/model';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const quiet = console.error;
console.error = (...args: unknown[]) => { if (!String(args[0]).includes('react-test-renderer is deprecated')) quiet(...args); };
let saved: string | null = null;
let readFails = false;
let chatRecord: string | null = null;
let nightsRecord: string | null = null;
const fakePurchaseCalls: string[] = [];
let listeners = new Set<(info: ReturnType<typeof customerInfo>) => void>();
const customerInfo = (paid: boolean) => ({
  entitlements: { active: paid ? { paid: { isActive: true } } : {} },
});
let storePaid = false;
// Holds the store's first answer back, like RevenueCat on a slow cold start (lane 5N).
let customerInfoWait: Promise<void> | undefined;
let storeUser = '$RCAnonymousID:test';
let purchaseError: string | undefined;
let restorePaid = false;
let restoreWait: Promise<void> | undefined;
let introPrice: object | null = null;
const packageFor = (plan: 'yearly' | 'monthly') => ({
  identifier: plan === 'yearly' ? '$rc_annual' : '$rc_monthly',
  product: {
    identifier: products.products[plan].id,
    subscriptionPeriod: plan === 'yearly' ? 'P1Y' : 'P1M',
    priceString: plan === 'yearly' ? '$38.49' : '$6.29',
    pricePerMonthString: plan === 'yearly' ? '$3.21' : null,
    introPrice,
  },
});
(globalThis as any).__pbsPurchases = {
  configure: ({ apiKey }: { apiKey: string }) => assert.equal(apiKey, 'render-test-key'),
  getAppUserID: async () => storeUser,
  logIn: async (id: string) => {
    fakePurchaseCalls.push(id);
    storeUser = id;
    return { customerInfo: customerInfo(storePaid) };
  },
  getOfferings: async () => ({
    current: { identifier: products.offering, availablePackages: [packageFor('monthly'), packageFor('yearly')] },
  }),
  getCustomerInfo: async () => { await customerInfoWait; return customerInfo(storePaid); },
  addCustomerInfoUpdateListener: (fn: (info: ReturnType<typeof customerInfo>) => void) => listeners.add(fn),
  removeCustomerInfoUpdateListener: (fn: (info: ReturnType<typeof customerInfo>) => void) => listeners.delete(fn),
  purchasePackage: async (pkg: ReturnType<typeof packageFor>) => {
    fakePurchaseCalls.push(pkg.product.identifier);
    if (purchaseError) throw { code: purchaseError };
    return { customerInfo: customerInfo(storePaid = true) };
  },
  restorePurchases: async () => {
    fakePurchaseCalls.push('restore');
    await restoreWait;
    return customerInfo(storePaid = restorePaid);
  },
};
const local = new Map<string, string>();
(globalThis as any).__pbsStorage = {
  getItem: async (key: string) => {
    if (readFails) throw new Error('unavailable');
    if (key === 'peace-be-still-chat-token') return chatRecord;
    if (key === NIGHTS_KEY) return nightsRecord;
    return key === 'peace-be-still-settings' ? saved : local.get(key) ?? null;
  },
  setItem: async (key: string, value: string) => {
    if (key === 'peace-be-still-chat-token') chatRecord = value;
    else if (key === NIGHTS_KEY) nightsRecord = value;
    else if (key === 'peace-be-still-settings') saved = value;
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
  dismissTo: (href: unknown) => calls.push(['dismissTo', href]),
  canGoBack: () => history,
  canDismiss: () => history,
};

// Loaded after the globals above exist.
const { NowPlaying } = require('../src/screens/listen/NowPlaying');
const { NIGHTS_KEY, nightOf } = require('../src/screens/listen/nights') as typeof import('../src/screens/listen/nights');
const { tracks: audioTracks } = require('../src/player/usePlayer') as { tracks: Track[] };
const { Daily } = require('../src/screens/daily/Daily');
const { SettingsProvider, useSettings } = require('../src/settings');
const { PurchasesProvider, useCanUse } = require('../src/purchases/provider') as typeof import('../src/purchases/provider');
const { Text } = require('react-native');
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
  biblePage: require('../app/bible/[page]').default,
  dailyPage: require('../app/today/[page]').default,
  nights: require('../app/(tabs)/nights').default,
  listen: require('../app/listen/[track]').default,
  more: require('../app/(tabs)/more').default,
  settings: require('../app/settings').default,
  paid: require('../app/paid').default,
  notFound: require('../app/+not-found').default,
};
type Name = Exclude<keyof typeof screens, 'root'>;

const base: Settings = { door: 'faith', age: 'adult', ageSetAt: 0, voice: 'plain', language: 'en' };
const store = () => JSON.parse(saved!) as Settings;

/** A paid subscriber on a phone: lane 5S's provider reads the fake store as subscribed. */
function asSubscriber(paid = true) {
  (globalThis as any).__pbsPlatform = 'ios';
  (globalThis as any).__pbsExpoConfig = { extra: { revenueCatIosKey: 'render-test-key' } };
  chatRecord = JSON.stringify({ age: 'adult', token: 'render-token', installId: 'render-install' });
  storePaid = paid;
  storeUser = '$RCAnonymousID:test';
}

const audioBase = 'https://pbs-audio.professionalresourcelibrary.com/';
let publishedTracks: Track[];
beforeEach(() => {
  Object.assign(globalThis, { __pbsPlatform: 'web', __pbsAudioStop: null, __pbsExpoConfig: undefined });
  nightsRecord = null;
  storePaid = false;
  publishedTracks = audioTracks;
});
const realFetch = globalThis.fetch;
mock.method(globalThis, 'fetch', async (url: string) => {
  // Lane 2S loads the Bible database from its bundled asset (a data: URL here); only the audio manifest is faked.
  if (url.startsWith('data:')) return realFetch(url);
  assert.equal(url, audioBase + 'manifest.jsonl');
  return new Response(publishedTracks.map(track => JSON.stringify({ ...track, status: 'passed' })).join('\n'));
});
beforeEach(() => { calls = []; history = false; (globalThis as any).__pbsParams = {}; (globalThis as any).__pbsSegments = []; (globalThis as any).__pbsScheme = 'light'; (globalThis as any).__pbsLocale = 'en'; readFails = false; });

async function mount(name: Name, value: object | null = base, params: Record<string, string> = {}, override?: React.ComponentType) {
  saved = value ? JSON.stringify(value) : null;
  (globalThis as any).__pbsParams = params;
  const Screen = override ?? screens[name];
  let tree!: ReactTestRenderer;
  // Like the root layout, a screen is drawn only once the saved settings are read.
  const Gate = () => {
    const canUse = useCanUse();
    return <Text>{String(canUse('offline'))} {String(canUse('bibleText'))}</Text>;
  };
  const Ready = () => (useSettings().ready ? <PurchasesProvider>
    <Screen />
    {name === 'paid' && <Gate />}
  </PurchasesProvider> : null);
  await act(async () => {
    tree = create(<SettingsProvider><Ready /></SettingsProvider>, {
      createNodeMock: element => element.type === 'ScrollView' ? { scrollTo: (options: unknown) => calls.push(['scrollTo', options]) } : null,
    });
  });
  return tree;
}
const scripture = (node: ReactTestInstance): boolean => node.props.testID === 'scripture-text' || (!!node.parent && scripture(node.parent));
const texts = (tree: ReactTestRenderer, includeScripture = true) => tree.root.findAll(n => (n.type as unknown) === 'Text' && (includeScripture || !scripture(n))).map(n => n.children.filter(x => typeof x === 'string').join('')).filter(Boolean);
const strings = (tree: ReactTestRenderer) => texts(tree).join(' | ');
const host = (tree: ReactTestRenderer, type: string) => tree.root.findAll(n => (n.type as unknown) === type);
const textOf = (node: ReactTestInstance) => node.findAll(n => (n.type as unknown) === 'Text').map(t => t.children.filter(x => typeof x === 'string').join('')).join(' ');
// An icon button (the player's play/pause) is found by its spoken label, like a screen reader finds it.
const labelOf = (node: ReactTestInstance) => node.props.accessibilityLabel ?? textOf(node);
const button = (tree: ReactTestRenderer, label: string) => host(tree, 'Pressable').find(n => labelOf(n) === label);
async function press(tree: ReactTestRenderer, text: string | RegExp) {
  const match = (s: string) => typeof text === 'string' ? s.includes(text) : text.test(s);
  const target = host(tree, 'Pressable').find(n => match(textOf(n)) || (typeof n.props.accessibilityLabel === 'string' && match(n.props.accessibilityLabel)));
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
  assert.match(shown, /Today's declaration.*Today's story.*Tonight: Psalm Nights/s);
  assert.doesNotMatch(shown, /WELCOME|Welcome|Good to have you/);
  await press(faith, /^Open  ›$/);
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
    ['today', person], ['bible', person],
    ...['books', 'search', 'saved'].map(page => ['biblePage', person, { page }] as [Name, object, Record<string, string>]),
    ...['declaration', 'story', 'stories', 'plans', 'journal'].map(page => ['dailyPage', person, { page }] as [Name, object, Record<string, string>]),
    ['nights', person], ['more', person], ['settings', person], ['notFound', person],
  ];
  if (age !== 'child') pages.push(['chat', person], ['paid', person]);
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
  const sameInBoth = new Set(['Peace Be Still', 'Hush Harbor', 'Mi Refugio', 'Biblia y Chat en Español', 'Morning Word', 'Young Faith', 'Imagination Nights', 'Chat', 'English', 'Español', 'Español (Mi Refugio)', 'Reina-Valera 1909', 'King James Version']);
  const english = new Set(Object.values(en).flatMap(v => typeof v === 'string' ? [v] : Object.values(v as object) as string[]).filter(v => !sameInBoth.has(v)));
  const people = [
    { ...base, language: 'es', journey: 'psalm-nights' }, { ...base, language: 'es', door: 'mindset', journey: 'imagination-nights' },
    { ...base, language: 'en', journey: 'mi-refugio', voice: 'spanish' },
  ];
  const leaks: string[] = [];
  for (const person of people) {
    const pages: Name[] = person.language === 'es' ? ['door', 'age', 'journeys', 'today', 'chat', 'bible', 'nights', 'more', 'settings', 'paid', 'notFound'] : ['today', 'chat', 'bible', 'nights', 'more', 'paid'];
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

test('a Bible verse link scrolls the expanded verse into view once its row is laid out', async () => {
  for (const journey of ['psalm-nights', 'mi-refugio'] as const) {
    calls = [];
    const tree = await mount('biblePage', { ...base, journey }, { page: 'chapter', book: 'PSA', chapter: '119', verse: '105' });
    const verses = host(tree, 'Text').filter(node => node.props.testID === 'scripture-text');
    const target = verses.find(node => node.props.accessibilityState.expanded);
    assert.equal(target, verses[104]);
    assert.ok(target);
    const row = target.parent!;
    const measured = verses.filter(node => node.parent?.props.onLayout);
    assert.equal(measured.length, 1);
    assert.equal(measured[0], target);
    assert.deepEqual(calls, []);
    const event = { nativeEvent: { layout: { x: 20, y: 6100, width: 350, height: 100 } } };
    await act(async () => row.props.onLayout(event));
    assert.deepEqual(calls, [['scrollTo', { y: 6088, animated: false }]]);
    // A highlight or a font change can lay out the row again after the reader has moved on.
    await act(async () => row.props.onLayout(event));
    assert.equal(calls.length, 1);
  }
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
    assert.equal(verseNode.props.accessibilityState.selected, false);
    await act(async () => verseNode.props.onPress());
    assert.equal(verseNode.props.accessibilityState.selected, true);
    assert.equal(verseNode.props['aria-expanded'], true);
    await act(async () => verseNode.props.onPress());
    assert.deepEqual(verseNode.props.accessibilityState, { expanded: false, selected: false });
    await act(async () => verseNode.props.onPress());
    const linked = await mount('biblePage', person, { page: 'chapter', book: 'JHN', chapter: '3', verse: '16' });
    assert.ok(host(linked, 'Text').some(node => node.props.accessibilityState?.selected && textOf(node).replace(/\s+/g, ' ').includes(shownVerse)));
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

  const source = () => gunzipSync(readFileSync(`../content/bible/${locale === 'es' ? 'rv1909' : 'kjv'}_vpl.txt.gz`)).toString();
  /** The stored text of a reference (one verse or a run), as the reader shows it. */
  const stored = (data: string, ref: string) => {
    const r = parseReference(ref)!;
    const lines: string[] = [];
    for (let v = r.verse!; v <= (r.endVerse ?? r.verse!); v++) {
      const prefix = `${r.book} ${r.chapter}:${v} `;
      lines.push(displayRuns(data.split('\n').find(line => line.startsWith(prefix))!.slice(prefix.length).trim()).map(run => run.text).join(''));
    }
    return lines.join(' ').replace(/\s+/g, ' ').trim();
  };
  // The words exactly as drawn: every string inside the scripture text, in order, nothing added between runs.
  const leaves = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(leaves).join('');
  const shown = (tree: ReactTestRenderer) => host(tree, 'Text').filter(node => node.props.testID === 'scripture-text').map(node => leaves(node).replace(/\s+/g, ' ').trim());
  const renderDaily = (page: DailyPage, date: Date, value: object = person, storyId?: string) => mount('dailyPage', value, {}, () =>
    <Daily page={page} now={date} id={storyId} back={() => {}} read={() => {}}
      upgrade={() => calls.push(['push', '/paid'])} open={(next: DailyPage, id?: string) => calls.push(['open', [next, id]])} />);

  test(`Daily ${locale}: today's story is a passed library story in every build, read from its own telling`, async () => {
    const now = new Date();
    const data = source();
    const shelfNow = shelf(tellingFor(locale, person.journey as JourneyId), 'adult');
    assert.ok(shelfNow.length >= 60);
    const story = storyFor(shelfNow, now)!;
    assert.equal(story.lang, locale);
    const today = await mount('today', person);
    assert.ok(strings(today).includes(story.title));
    assert.ok(!/draft|borrador/i.test(strings(today)));
    await press(today, copy['daily.openStory']);
    assert.deepEqual(calls.at(-1), ['push', { pathname: '/today/[page]', params: { page: 'story' } }]);
    // Seven days in a row: seven different stories, each one's scripture exactly the stored text, each labelled.
    const seen = new Set<string>();
    for (let day = 0; day < 7; day++) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day);
      const expected = storyFor(shelfNow, date)!;
      seen.add(expected.id);
      const page = await renderDaily('story', date);
      const text = strings(page);
      assert.ok(text.includes(expected.title) && text.includes(copy['story.ai']) && text.includes(copy['daily.retelling']), expected.id);
      const scripture = expected.blocks.filter(block => block.type === 'scripture');
      assert.deepEqual(shown(page), scripture.map(block => stored(data, block.ref)), expected.id);
      assert.deepEqual(faithContentIssues(texts(page, false).join(' | ')), [], expected.id);
    }
    assert.equal(seen.size, 7);
    // The free lane reads today's story only: the archive and a past story's link lead to the paid lane.
    const free = await renderDaily('story', now);
    await press(free, copy['story.pastPaid']);
    assert.deepEqual(calls.at(-1), ['push', '/paid']);
    const archive = await renderDaily('stories', now);
    assert.ok(!pastStories(shelfNow, now).some(({ story: item }) => strings(archive).includes(item.title)));
    assert.ok(strings(archive).includes(copy['story.pastPaid']));
    const yesterday = pastStories(shelfNow, now)[0].story;
    const deepLink = await renderDaily('story', now, person, yesterday.id);
    assert.ok(strings(deepLink).includes(story.title) && !strings(deepLink).includes(yesterday.title));
  });

  test(`Daily ${locale}: the free declaration is the day's line with its stored verse; topics and longer plans lead to the paid lane`, async () => {
    const now = new Date();
    const data = source();
    for (let day = 0; day < 3; day++) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day);
      const row = dailyDeclaration(locale, date);
      const screen = await renderDaily('declaration', date);
      assert.ok(strings(screen).includes(row.text));
      assert.deepEqual(shown(screen), [stored(data, row.ref)]);
      assert.ok(strings(screen).includes(formatReference(parseReference(row.ref)!, locale)));
      assert.ok(strings(screen).includes(copy['daily.prayer']));
      assert.equal(radios(screen).length, 0);
    }
    const today = await mount('today', person);
    assert.ok(shown(today).includes(stored(data, dailyDeclaration(locale, now).ref)));
    const word = await mount('dailyPage', person, { page: 'declaration' });
    await press(word, copy['declaration.topicsPaid']);
    assert.deepEqual(calls.at(-1), ['push', '/paid']);
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
    const mindset = await mount('dailyPage', { ...person, door: 'mindset', journey: 'imagination-nights', language: locale }, { page: 'declaration' });
    assert.equal(shown(mindset).length, 0);
    assert.ok(!strings(mindset).includes(copy['daily.prayer']));
    assert.ok(mindsetDeclarations.some(item => strings(mindset).includes(copy[item.line])));
    const plansPage = await mount('dailyPage', person, { page: 'plans' });
    const basic = plans.filter(plan => !plan.paid);
    for (const plan of basic) assert.ok(strings(plansPage).includes(copy[plan.title]));
    await press(plansPage, copy[locale === 'es' ? 'daily.plan.courage' : 'daily.plan.rest']);
    assert.equal(host(plansPage, 'Pressable').filter(node => textOf(node) === copy['daily.plan.complete']).length, 7);
    await press(plansPage, copy['daily.plan.complete']);
    assert.ok(strings(plansPage).includes(copy['daily.done']));
    const longer = await mount('dailyPage', person, { page: 'plans' });
    await press(longer, copy['plan.heavy.title']);
    assert.deepEqual(calls.at(-1), ['push', '/paid']);
    assert.ok(!strings(longer).includes(copy['daily.plan.day'].replace('%{day}', '30')));
    const journal = await mount('dailyPage', person, { page: 'journal' });
    const entry = `Test note ${locale}`;
    await type(journal, entry);
    await press(journal, copy['daily.saveNote']);
    assert.equal(JSON.parse(local.get('pbs-daily')!).journal[dayKey(now)], entry);
    const reopened = await mount('dailyPage', person, { page: 'journal' });
    assert.equal(host(reopened, 'TextInput')[0].props.value, entry);
    const completed = await mount('today', person);
    assert.ok(strings(completed).includes(copy['today.week'].one.replace('%{count}', '1')));
  });

  test(`Paid ${locale}: every past story, longer plans and declaration topics open once the store says paid`, async () => {
    const now = new Date();
    const data = source();
    const shelfNow = shelf(tellingFor(locale, person.journey as JourneyId), 'adult');
    const past = pastStories(shelfNow, now);
    assert.equal(past.length, shelfNow.length - 1);
    assert.equal(new Set([storyFor(shelfNow, now)!.id, ...past.map(item => item.story.id)]).size, shelfNow.length);
    const archive = await asPaid(() => renderDaily('stories', now));
    try {
      for (const { story } of past) assert.ok(strings(archive).includes(story.title), story.id);
      await press(archive, past[3].story.title);
      assert.deepEqual(calls.at(-1), ['open', ['story', past[3].story.id]]);
    } finally { await closePaid(archive); }
    const old = await asPaid(() => renderDaily('story', now, person, past[3].story.id));
    try {
      assert.ok(strings(old).includes(past[3].story.title));
      assert.deepEqual(shown(old), past[3].story.blocks.filter(block => block.type === 'scripture').map(block => stored(data, block.ref)));
    } finally { await closePaid(old); }

    const plansPage = await asPaid(() => mount('dailyPage', person, { page: 'plans' }));
    try {
      await press(plansPage, copy['plan.heavy.title']);
      const heavy = plans.find(plan => plan.id === 'heavy-30')!;
      assert.equal(host(plansPage, 'Pressable').filter(node => textOf(node) === copy['daily.plan.complete']).length, heavy.readings.length);
      assert.ok(strings(plansPage).includes(formatReference(parseReference('Revelation 21:1-7')!, locale)));
    } finally { await closePaid(plansPage); }

    const linked = await asPaid(() => mount('dailyPage', person, { page: 'plans', id: 'heavy-30' }));
    try { assert.equal(host(linked, 'Pressable').filter(node => textOf(node) === copy['daily.plan.complete']).length, 30); } finally { await closePaid(linked); }
    const lockedLink = await mount('dailyPage', person, { page: 'plans', id: 'heavy-30' });
    // Free, the same link shows the plan list with the paid note, never the plan's days.
    assert.equal(host(lockedLink, 'Pressable').filter(node => textOf(node) === copy['daily.plan.complete']).length, 0);
    assert.ok(strings(lockedLink).includes(copy['plan.paidNote']));
    const word = await asPaid(() => mount('dailyPage', person, { page: 'declaration' }));
    try {
      assert.equal(radios(word).length, topics.length + 1);
      await press(word, copy['declaration.topic.workMoney']);
      assert.equal(JSON.parse(local.get('pbs-daily')!).topic, 'work-money');
      const inTopic = byTopic(locale, 'work-money');
      const chosen = dailyDeclaration(locale, now, 'work-money');
      assert.ok(inTopic.some(item => item.id === chosen.id));
      for (const item of inTopic) assert.ok(strings(word).includes(item.text), item.id);
      assert.ok(shown(word).includes(stored(data, chosen.ref)));
      await press(word, copy['declaration.anyTopic']);
      assert.equal(JSON.parse(local.get('pbs-daily')!).topic, undefined);
    } finally { await closePaid(word); }

    const mindset = { ...person, door: 'mindset', journey: 'imagination-nights', language: locale };
    const scene = await asPaid(() => mount('dailyPage', mindset, { page: 'declaration' }));
    try {
      assert.equal(radios(scene).length, mindsetTopics.length + 1);
      await press(scene, copy['declaration.topic.work']);
      for (const item of mindsetDeclarations.filter(row => row.topic === 'work')) assert.ok(strings(scene).includes(copy[item.line]));
      assert.equal(shown(scene).length, 0);
      await press(scene, copy['declaration.anyTopic']);
    } finally { await closePaid(scene); }
    // The Mindset door never reaches stories or reading plans, paid or not.
    for (const page of ['story', 'stories', 'plans']) {
      const tree = await asPaid(() => mount('dailyPage', mindset, { page }));
      try { assert.deepEqual(host(tree, 'Redirect')[0]?.props.href, '/today'); } finally { await closePaid(tree); }
    }
  });
}

function testPlayer(track: Track, baseUrl: string | null = audioBase, position = 0,
  fetchHash: () => Promise<string> = async () => track.sha256, offline = false) {
  let at = 0;
  let source: string | undefined;
  let playing = false;
  let listener: ((status: { playing: boolean; isLoaded: boolean; didJustFinish: boolean }) => void) | undefined;
  const audio = {
    load: (uri: string) => { source = uri; at = 0; },
    play() { if (offline) throw new Error('network'); playing = true; },
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
  const psalmNight = audioTracks.find(track => track.kind === 'psalm-night' && track.lang === 'en')!;
  assert.ok(psalm && bible && story && psalmNight);
  const open = async (title: string, track: Track) => {
    await press(tree, title);
    assert.deepEqual(calls.pop(), ['push', { pathname: '/listen/[track]', params: { track: track.sha256 } }]);
  };
  const psalmShelf = host(tree, 'Pressable').find(node => textOf(node).startsWith(en['journey.psalmNights.name'] + ' '));
  // Whispered Psalm Nights sessions sit on the Psalms shelf beside the read Psalms.
  const count = audioTracks.filter(track => (track.kind === 'psalms' || track.kind === 'psalm-night') && track.lang === 'en').length;
  assert.ok(psalmShelf && textOf(psalmShelf).includes(i18n.t('listen.whisperedNights', { locale: 'en', count })));
  const cardRow = psalmShelf.findAll(node => (node.type as unknown) === 'View' && node.props.style?.flexDirection === 'row')[0];
  assert.ok(cardRow, 'The shelf details and chevron should share a horizontal row');
  assert.ok(textOf(cardRow).endsWith(' ›'));
  assert.equal(psalmShelf.props['aria-expanded'], false);
  await press(tree, en['journey.psalmNights.name']);
  assert.equal(psalmShelf.props['aria-expanded'], true);
  await open(trackTitle(psalm, 'en'), psalm);
  await open(trackTitle(psalmNight, 'en'), psalmNight);
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
      assert.ok(button(screen, en['listen.pause']));
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
        assert.equal(button(screen, en['listen.play'])?.props.disabled, true);
        for (const label of [en['listen.back15'], en['listen.forward15']]) {
          assert.equal(host(screen, 'Pressable').find(node => node.props.accessibilityLabel === label)?.props.disabled, true);
        }
        if (unavailable === track) {
          const stored = storedVerse('PSA', 4, 1);
          const supplied = stored.match(/\[([^\]]+)\]/)?.[1];
          assert.ok(supplied, 'Psalm 4 contains translator-supplied words');
          const italic = host(screen, 'Text').find(node => node.children.join('') === supplied);
          assert.equal(italic?.props.style?.fontFamily, 'LibreCaslonText_400Regular_Italic');
          assert.doesNotMatch(strings(screen), /[\[\]]/, 'no KJV bracket reaches the screen');
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
    // The shelf follows the published library: a count once sessions in this language exist, else the empty line.
    const count = audioTracks.filter(track => track.kind === 'imagination-night' && track.lang === language).length;
    if (count) assert.ok(strings(mindset).includes(i18n.t('listen.nights', { locale: language, count })), language + ' mindset: ' + texts(mindset).join(' | '));
    else assert.ok(texts(mindset).includes(locale['listen.emptyShelf']), language + ' mindset: ' + texts(mindset).join(' | '));
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
  assert.equal(button(tree, en['listen.play'])?.props.disabled, true);
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
    assert.ok(button(tree, en['listen.resume']));
    await press(tree, en['listen.resume']);
    assert.equal(player.position(), 12);
    assert.ok(texts(tree).includes(storedVerse('PSA', 23, 2)));
    assert.ok(strings(tree).includes('Psalm 23:2 · KJV'));
    // A KJV Psalm chapter is free Bible audio (COMMON.md free lane): no night allowance, nothing counted.
    assert.ok(!texts(tree).includes(en['listen.psalmAllowance']));
    assert.equal(nightsRecord, null);
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
  asSubscriber();
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
  // The middle of the story player holds its key verse (the one the call and response answers), never a hole.
  const keyVerse = story.blocks.find((block: { ref?: string }) => block.ref === 'MAR 4:39');
  assert.equal(track.scriptureRef, 'MAR 4:39');
  const scripture = english.root.find(node => node.props.testID === 'scripture-text' && (node.type as unknown) === 'Text');
  assert.equal(textOf(scripture).replace(/ /g, ''), storedVerse('MAR', 4, 39).replace(/^¶\s*/, '').replace(/ /g, ''));
  assert.ok(strings(english).includes(keyVerse.label + ' · KJV'));
  const order = texts(english);
  const title = order.indexOf(trackTitle(track, 'en'));
  const reference = order.findIndex(text => text.includes(keyVerse.label));
  assert.ok(title >= 0 && title < reference && reference < order.indexOf('0:00'), `title, verse, then progress: ${order.join(' | ')}`);
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
  const Ready = () => useSettings().ready ? <PurchasesProvider><NowPlaying track={track} close={() => undefined} /></PurchasesProvider> : null;
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


const readyForPaid = { ...base, journey: 'psalm-nights' } as const;

async function mountPaid(value: Settings = readyForPaid, setup?: () => void) {
  (globalThis as any).__pbsPlatform = 'ios';
  (globalThis as any).__pbsExpoConfig = { extra: { revenueCatIosKey: 'render-test-key' } };
  chatRecord = JSON.stringify({ age: value.age, token: 'render-token', installId: 'render-install' });
  storePaid = false;
  restorePaid = false;
  restoreWait = undefined;
  purchaseError = undefined;
  introPrice = null;
  listeners = new Set();
  storeUser = '$RCAnonymousID:test';
  fakePurchaseCalls.length = 0;
  setup?.();
  return mount('paid', value);
}

/** Any screen, mounted with the store reporting an active paid entitlement (the same fake store as the price screen). */
async function asPaid(render: () => Promise<ReactTestRenderer>) {
  (globalThis as any).__pbsPlatform = 'ios';
  (globalThis as any).__pbsExpoConfig = { extra: { revenueCatIosKey: 'render-test-key' } };
  chatRecord = JSON.stringify({ age: 'adult', token: 'render-token', installId: 'render-install' });
  storeUser = 'render-install';
  storePaid = true;
  listeners = new Set();
  const tree = await render();
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
  return tree;
}

async function closePaid(tree: ReactTestRenderer) {
  await act(async () => tree.unmount());
  (globalThis as any).__pbsPlatform = 'web';
  storePaid = false;
  (globalThis as any).__pbsOpenURL = undefined;
}

const paidControls = (tree: ReactTestRenderer) => host(tree, 'Pressable').filter(n => n.props.accessibilityRole === 'button');
const restoreControl = (tree: ReactTestRenderer) => host(tree, 'Pressable').find(n => /restore purchases/i.test(textOf(n)))!;
const gate = (tree: ReactTestRenderer) => texts(tree).at(-1);

test('Settings opens the paid lane and its close control takes the visitor back', async () => {
  const settings = await mount('settings', readyForPaid);
  await press(settings, /paid lane/i);
  assert.deepEqual(calls, [['push', '/paid']]);
  const tree = await mount('paid', readyForPaid);
  assert.match(strings(tree), /App Store prices are unavailable/i);
  assert.equal(paidControls(tree).length, 0);
  assert.equal(restoreControl(tree).props.accessibilityRole, 'link');
  assert.equal(restoreControl(tree).props.accessibilityState.disabled, true);
  const links = host(tree, 'View').find(n => n.props.style?.columnGap === 20);
  assert.equal(links?.props.style.alignItems, 'center');
  assert.doesNotMatch(strings(tree), /no trial/i);
  assert.equal(gate(tree), 'false true');
  await press(tree, /close/i);
  assert.deepEqual(calls.at(-1), ['replace', '/settings']);
});

test('the rendered paid lane discloses benefits, actual store prices, renewal terms, promises and working links in both languages', async () => {
  for (const locale of ['en', 'es'] as const) {
    const value: Settings = { ...readyForPaid, journey: locale === 'es' ? 'mi-refugio' : 'psalm-nights' };
    const tree = await mountPaid(value);
    try {
      const es = locale === 'es';
      assert.deepEqual(faithContentIssues(strings(tree)), []);
      const choices = () => radios(tree);
      assert.equal(choices().length, 2);
      const group = host(tree, 'View').find(n => n.props.role === 'radiogroup');
      assert.ok(group);
      assert.equal(group.props.style.flexDirection, 'column');
      assert.equal(host(tree, 'Text').find(n => n.props.accessibilityRole === 'header')?.props.style[0].fontSize, 30);
      assert.match(textOf(choices()[0]), /\$38\.49/);
      assert.match(textOf(choices()[1]), /\$6\.29/);
      assert.match(choices()[0].props['aria-label'], es ? /Anual.*\$38\.49.*al año/ : /Yearly.*\$38\.49.*a year/);
      assert.match(choices()[1].props['aria-label'], es ? /Mensual.*\$6\.29.*al mes/ : /Monthly.*\$6\.29.*a month/);
      assert.equal(choices()[0].props['aria-checked'], true);
      assert.match(textOf(paidControls(tree)[0]), /\$38\.49/);
      for (const meaning of es
        ? [/memoria/, /cada noche/, /historias anteriores/, /sin conexión/, /sin período de prueba/i, /gratis sigue siendo gratis/, /precio no sube/, /100 mensajes/, /24 horas/]
        : [/remembers/, /every night/, /past story/, /offline/, /no trial/i, /free is ever taken back/, /price never rises/, /100 messages/, /24 hours/]) {
        assert.match(strings(tree), meaning);
      }
      await press(tree, /\$6\.29/);
      assert.equal(choices()[1].props['aria-checked'], true);
      assert.match(textOf(paidControls(tree)[0]), /\$6\.29/);
      assert.match(strings(tree), es ? /cada mes por \$6\.29/ : /monthly at \$6\.29/);
      const links: string[] = [];
      (globalThis as any).__pbsOpenURL = (url: string) => links.push(url);
      await press(tree, es ? /dos toques/ : /two taps/);
      await press(tree, es ? /términos/i : /terms/i);
      await press(tree, es ? /privacidad/i : /privacy/i);
      assert.deepEqual(links, [
        'https://apps.apple.com/account/subscriptions',
        `https://peacebestillapp.com/${es ? 'es/terminos' : 'terms'}`,
        `https://peacebestillapp.com/${es ? 'es/privacidad' : 'privacy'}`,
      ]);
      assert.ok(host(tree, 'Pressable').some(n => /restore|restaurar/i.test(textOf(n))));
    } finally { await closePaid(tree); }
  }
});

test('checkout uses the existing install identity and selected package and switches the actual feature gate', async () => {
  const tree = await mountPaid();
  try {
    assert.equal(gate(tree), 'false true');
    await press(tree, /\$6\.29/);
    await press(tree, /Join /);
    assert.deepEqual(fakePurchaseCalls, ['render-install', products.products.monthly.id]);
    assert.equal(gate(tree), 'true true');
    assert.match(strings(tree), /paid access is active/);
    assert.equal(paidControls(tree).length, 0);
  } finally { await closePaid(tree); }
});

test('restore checks the store and grants access only when paid is active', async () => {
  const tree = await mountPaid();
  try {
    await press(tree, /restore purchases/i);
    assert.equal(gate(tree), 'false true');
    assert.match(strings(tree), /didn’t find.*active subscription/);
    restorePaid = true;
    let finish!: () => void;
    restoreWait = new Promise(resolve => { finish = resolve; });
    await press(tree, /restore purchases/i);
    assert.equal(restoreControl(tree).props.accessibilityRole, 'link');
    assert.equal(restoreControl(tree).props.accessibilityState.disabled, true);
    assert.equal(restoreControl(tree).props.onPress, undefined);
    await act(async () => finish());
    assert.deepEqual(fakePurchaseCalls, ['render-install', 'restore', 'restore']);
    assert.equal(gate(tree), 'true true');
    assert.match(strings(tree), /paid access is active/);
  } finally { await closePaid(tree); }
});

test('Ask to Buy leaves paid access locked until the RevenueCat listener reports approval', async () => {
  const tree = await mountPaid({ ...readyForPaid, age: 'teen' }, () => { purchaseError = '20'; });
  try {
    await press(tree, /Join /);
    assert.deepEqual(fakePurchaseCalls, ['render-install', products.products.yearly.id]);
    assert.match(strings(tree), /waiting for a parent or guardian/);
    assert.equal(gate(tree), 'false true');
    assert.equal(paidControls(tree).length, 0);
    await act(async () => listeners.forEach(fn => fn(customerInfo(true))));
    assert.equal(gate(tree), 'true true');
    assert.doesNotMatch(strings(tree), /waiting for a parent or guardian/);
  } finally { await closePaid(tree); }
});

test('failure leaves the free lane in place and makes checkout available again', async () => {
  const tree = await mountPaid({ ...readyForPaid, language: 'es' }, () => { purchaseError = '2'; });
  try {
    await press(tree, /Suscríbete/);
    assert.match(strings(tree), /completar la compra/i);
    assert.equal(gate(tree), 'false true');
    purchaseError = undefined;
    await press(tree, /Suscríbete/);
    assert.equal(gate(tree), 'true true');
  } finally { await closePaid(tree); }
});

test('a storefront with an introductory offer cannot present a no-trial checkout', async () => {
  const tree = await mountPaid(readyForPaid, () => { introPrice = {}; });
  try {
    assert.match(strings(tree), /prices are unavailable/);
    assert.equal(paidControls(tree).length, 0);
    assert.equal(gate(tree), 'false true');
    introPrice = null;
    await press(tree, /try again/i);
    assert.match(textOf(paidControls(tree)[0]), /\$38\.49/);
  } finally { await closePaid(tree); }
});

test('a first purchase provisions and persists the shared install identity before reaching the store', async () => {
  const fetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = async (url, options) => {
    requests.push(String(url));
    assert.deepEqual(JSON.parse(String(options?.body)), { age: 'adult' });
    return Response.json({ token: 'new-token', installId: 'new-install' });
  };
  const tree = await mountPaid(readyForPaid, () => { chatRecord = null; });
  try {
    assert.deepEqual(requests, []);
    await press(tree, /Join /);
    assert.match(requests[0], /\/token$/);
    assert.equal(requests.length, 1);
    assert.deepEqual(JSON.parse(chatRecord!), { token: 'new-token', age: 'adult', installId: 'new-install' });
    assert.deepEqual(fakePurchaseCalls, ['new-install', products.products.yearly.id]);
    assert.equal(gate(tree), 'true true');
  } finally {
    globalThis.fetch = fetch;
    await closePaid(tree);
  }
});

test('the web preview shows configured prices and renewal terms without opening checkout or granting access', async () => {
  const previous = process.env.EXPO_PUBLIC_PBS_PREVIEW;
  process.env.EXPO_PUBLIC_PBS_PREVIEW = '1';
  fakePurchaseCalls.length = 0;
  try {
    for (const language of ['en', 'es'] as const) {
      const es = language === 'es';
      const tree = await mount('paid', { ...readyForPaid, language });
      const previewLabel = es ? /vista previa/i : /preview/i;
      try {
        const [yearly, monthly] = radios(tree);
        assert.match(textOf(yearly), /\$39\.99/);
        assert.match(textOf(yearly), /\$3\.33/);
        assert.match(textOf(monthly), /\$7\.99/);
        assert.match(textOf(paidControls(tree)[0]), previewLabel);
        assert.match(textOf(paidControls(tree)[0]), /\$39\.99/);
        const yearlyDisclosure = es
          ? /sin período de prueba.*cada año por \$39\.99/i
          : /no trial.*renews yearly at \$39\.99/i;
        assert.ok(texts(tree).some(line => yearlyDisclosure.test(line)));
        await press(tree, previewLabel);
        assert.deepEqual(fakePurchaseCalls, []);
        assert.equal(gate(tree), 'false true');
        const restore = host(tree, 'Pressable').find(n => (es ? /restaurar compras/i : /restore purchases/i).test(textOf(n)));
        assert.ok(restore);
        assert.equal(restore.props.accessibilityRole, 'link');
        assert.equal(restore.props['aria-disabled'], true);
        assert.equal(restore.props.onPress, undefined);
        await press(tree, /\$7\.99/);
        assert.match(textOf(paidControls(tree)[0]), /\$7\.99/);
        const monthlyDisclosure = es
          ? /sin período de prueba.*cada mes por \$7\.99/i
          : /no trial.*renews monthly at \$7\.99/i;
        assert.ok(texts(tree).some(line => monthlyDisclosure.test(line)));
      } finally { await closePaid(tree); }
    }
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_PBS_PREVIEW;
    else process.env.EXPO_PUBLIC_PBS_PREVIEW = previous;
  }
});

test('the web preview\'s paid switch opens the paid screens there, and only there', async () => {
  const shelfNow = shelf('plain', 'adult');
  const yesterday = pastStories(shelfNow, new Date())[0].story.title;
  const kept = new Map<string, string>();
  const fakeStorage = { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => void kept.set(k, v), removeItem: (k: string) => void kept.delete(k) };
  const previous = process.env.EXPO_PUBLIC_PBS_PREVIEW;
  (globalThis as any).localStorage = fakeStorage;
  const person = { ...base, journey: 'psalm-nights' };
  const archive = async () => strings(await mount('dailyPage', person, { page: 'stories' }));
  try {
    // The preview build, opened with ?paid=1: the archive opens, and the choice is remembered without the query.
    process.env.EXPO_PUBLIC_PBS_PREVIEW = '1';
    (globalThis as any).location = { search: '?paid=1' };
    assert.ok((await archive()).includes(yesterday), 'step 1');
    (globalThis as any).location = { search: '' };
    assert.ok((await archive()).includes(yesterday), 'step 2');
    // A phone build ignores the flag even when it is set and the variable leaks in.
    (globalThis as any).__pbsPlatform = 'ios';
    assert.ok(!(await archive()).includes(yesterday), 'step 3');
    (globalThis as any).__pbsPlatform = 'web';
    // A web build that is not the preview ignores it too.
    delete process.env.EXPO_PUBLIC_PBS_PREVIEW;
    assert.ok(!(await archive()).includes(yesterday), 'step 4');
    // ?paid=0 turns it off again in the preview.
    process.env.EXPO_PUBLIC_PBS_PREVIEW = '1';
    (globalThis as any).location = { search: '?paid=0' };
    assert.ok(!(await archive()).includes(yesterday), 'step 5');
    assert.equal(kept.size, 0);
  } finally {
    delete (globalThis as any).localStorage;
    delete (globalThis as any).location;
    (globalThis as any).__pbsPlatform = 'web';
    if (previous === undefined) delete process.env.EXPO_PUBLIC_PBS_PREVIEW;
    else process.env.EXPO_PUBLIC_PBS_PREVIEW = previous;
  }
});

// Lane 5N: the free lane's sleep nights. A whispered Psalm Night / Imagination Night is free the first night, then
// one a week; paid plays every night. Bible chapters stay free whatever the count.
const sleepTrack = (kind: 'psalm-night' | 'imagination-night', lang: 'en' | 'es'): Track => ({
  file: `${lang}/${kind}/render-${kind}.m4a`, kind, lang, seconds: 900, voice: 'kokoro:af_nicole',
  titles: { [lang]: kind === 'psalm-night' ? (lang === 'es' ? 'Salmo 23' : 'Psalm 23') : 'Living in the end' },
  sha256: (kind === 'psalm-night' ? 'a' : 'b').repeat(63) + (lang === 'en' ? '1' : '2'),
  ref: `content/${kind === 'psalm-night' ? 'psalm-nights' : 'imagination-nights'}/${lang}/render.json#render`,
} as Track);

async function nightPlayer(track: Track, value: Settings, baseUrl: string | null = audioBase, offline = false) {
  publishedTracks = [...audioTracks, track];
  const player = testPlayer(track, baseUrl, 0, undefined, offline);
  saved = JSON.stringify(value);
  const Ready = () => useSettings().ready ? <PurchasesProvider><NowPlaying track={track} close={() => undefined} /></PurchasesProvider> : null;
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<SettingsProvider><Ready /></SettingsProvider>); });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
  return { tree, player, async close() { await act(async () => tree.unmount()); await player.dispose(); } };
}
const daysAgo = (n: number) => nightOf(new Date(Date.now() - n * 86_400_000));

test('a free listener gets the first night, then one a week, and a used week shows the next free night and the paid lane', async () => {
  const track = sleepTrack('psalm-night', 'en');
  const person: Settings = { ...base, journey: 'psalm-nights' };
  // First night ever: plays, and is counted once even when started again the same night.
  let s = await nightPlayer(track, person);
  try {
    await press(s.tree, en['listen.play']);
    assert.ok(button(s.tree, en['listen.pause']));
    assert.deepEqual(JSON.parse(nightsRecord!), [nightOf(new Date())]);
  } finally { await s.close(); }
  // The weekly night after the first: still free.
  nightsRecord = JSON.stringify([daysAgo(1)]);
  s = await nightPlayer(track, person);
  try {
    await press(s.tree, en['listen.play']);
    assert.deepEqual(JSON.parse(nightsRecord!), [daysAgo(1), nightOf(new Date())]);
  } finally { await s.close(); }
  // This week's night is used (3 nights ago): no play button, the date of the next free night, and the price screen.
  nightsRecord = JSON.stringify([daysAgo(10), daysAgo(3)]);
  s = await nightPlayer(track, person);
  try {
    assert.equal(button(s.tree, en['listen.play']), undefined);
    const next = new Date(); next.setDate(next.getDate() + 4);
    const day = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date(next.getFullYear(), next.getMonth(), next.getDate()));
    assert.ok(texts(s.tree).includes(i18n.t('listen.nextFreeNight', { locale: 'en', day })), strings(s.tree));
    assert.ok(!texts(s.tree).includes(en['listen.psalmAllowance']));
    await press(s.tree, en['listen.seePlans']);
    assert.deepEqual(calls.at(-1), ['push', '/paid']);
    assert.deepEqual(faithContentIssues(strings(s.tree)), []);
  } finally { await s.close(); }
  // Seven nights on, the week is free again.
  nightsRecord = JSON.stringify([daysAgo(10), daysAgo(7)]);
  s = await nightPlayer(track, person);
  try { assert.ok(button(s.tree, en['listen.play'])); } finally { await s.close(); }
});

test('a subscriber plays every night without spending free nights; after the plan ends tonight is still free; Bible chapters never count', async () => {
  nightsRecord = JSON.stringify([daysAgo(10), daysAgo(1)]);
  asSubscriber();
  for (let night = 0; night < 5; night++) {
    const s = await nightPlayer(sleepTrack('psalm-night', 'en'), { ...base, journey: 'psalm-nights' });
    try {
      await press(s.tree, en['listen.play']);
      assert.ok(!texts(s.tree).includes(en['listen.psalmWeekly']));
    } finally { await s.close(); }
  }
  assert.deepEqual(JSON.parse(nightsRecord!), [daysAgo(10), daysAgo(1)], 'paid nights are not taken from the free week');
  // The plan lapses: the free week is exactly as it was, so the next free night is still hers.
  nightsRecord = JSON.stringify([daysAgo(10), daysAgo(8)]);
  storePaid = false;
  let s = await nightPlayer(sleepTrack('psalm-night', 'en'), { ...base, journey: 'psalm-nights' });
  try { assert.ok(button(s.tree, en['listen.play'])); } finally { await s.close(); (globalThis as any).__pbsPlatform = 'web'; }
  nightsRecord = JSON.stringify([daysAgo(10), daysAgo(1)]);
  const chapter = audioTracks.find(track => track.kind === 'bible' && track.lang === 'en')!;
  s = await nightPlayer(chapter, { ...base, journey: 'psalm-nights' });
  try {
    await press(s.tree, en['listen.play']);
    assert.deepEqual(JSON.parse(nightsRecord!), [daysAgo(10), daysAgo(1)], 'a Bible chapter is not a sleep night');
    assert.ok(!strings(s.tree).includes(en['listen.seePlans']));
  } finally { await s.close(); }
});

test('a subscriber never sees the free lane lock while the store is still answering', async () => {
  nightsRecord = JSON.stringify([daysAgo(10), daysAgo(2)]);
  asSubscriber();
  let answer!: () => void;
  customerInfoWait = new Promise(resolve => { answer = resolve; });
  const s = await nightPlayer(sleepTrack('psalm-night', 'en'), { ...base, journey: 'psalm-nights' });
  try {
    assert.ok(!strings(s.tree).includes(en['listen.seePlans']), 'no lock before the store answers');
    assert.ok(!texts(s.tree).some(text => text.startsWith('Your next free night')));
    assert.equal(button(s.tree, en['listen.play'])?.props.disabled, true, 'play waits for the answer');
    await act(async () => { answer(); await new Promise(resolve => setTimeout(resolve, 0)); });
    assert.ok(!strings(s.tree).includes(en['listen.seePlans']));
    await press(s.tree, en['listen.play']);
  } finally { customerInfoWait = undefined; await s.close(); (globalThis as any).__pbsPlatform = 'web'; }
});

test('a session that fails to start does not spend the night', async () => {
  nightsRecord = JSON.stringify([daysAgo(10)]);
  const s = await nightPlayer(sleepTrack('psalm-night', 'en'), { ...base, journey: 'psalm-nights' }, null);
  try {
    await press(s.tree, en['listen.play']);
    assert.deepEqual(JSON.parse(nightsRecord!), [daysAgo(10)]);
    assert.ok(texts(s.tree).includes(en['listen.psalmWeekly']), 'after the first night the line says one a week');
  } finally { await s.close(); }
});

test('the used-night screen speaks Spanish in Mi Refugio and keeps the Mindset door free of faith words; under 13 sees no pitch and no price link', async () => {
  const used = () => { nightsRecord = JSON.stringify([daysAgo(20), daysAgo(2)]); };
  used();
  let s = await nightPlayer(sleepTrack('psalm-night', 'es'), { ...base, language: 'es', voice: 'spanish', journey: 'mi-refugio' });
  try {
    assert.ok(strings(s.tree).includes(es['listen.everyNight']));
    assert.ok(texts(s.tree).some(text => /^Tu próxima noche gratis es el [a-záéíóú]+ \d{1,2} de [a-z]+\.$/.test(text)), strings(s.tree));
    await press(s.tree, es['listen.seePlans']);
  } finally { await s.close(); }
  used();
  s = await nightPlayer(sleepTrack('imagination-night', 'en'), { ...base, door: 'mindset', journey: 'imagination-nights' });
  try {
    assert.ok(strings(s.tree).includes(en['listen.everyNight']));
    assert.doesNotMatch(strings(s.tree), /\b(bible|scripture|god|psalm|kjv|prayer|church|jesus|verse)\b/i);
  } finally { await s.close(); }
  used();
  s = await nightPlayer(sleepTrack('psalm-night', 'en'), { ...base, age: 'child', journey: 'psalm-nights' });
  try {
    assert.ok(texts(s.tree).some(text => text.startsWith('Your next free night')));
    assert.ok(!strings(s.tree).includes(en['listen.everyNight']), 'no subscription pitch to a child');
    assert.ok(!strings(s.tree).includes(en['listen.paidDownload']), 'no download pitch to a child either');
    assert.ok(!strings(s.tree).includes(en['listen.seePlans']));
  } finally { await s.close(); }
});

test('a first launch offline: the store never answers, the free night still works, and a failed start says it needs a connection', async () => {
  asSubscriber(false);
  const failing = (globalThis as any).__pbsPurchases.getCustomerInfo;
  (globalThis as any).__pbsPurchases.getCustomerInfo = async () => { throw new Error('offline'); };
  try {
    for (const [locale, value, track] of [
      ['en', { ...base, journey: 'psalm-nights' }, sleepTrack('psalm-night', 'en')],
      ['es', { ...base, language: 'es', voice: 'spanish', journey: 'mi-refugio' }, sleepTrack('psalm-night', 'es')],
    ] as const) {
      nightsRecord = null;
      const strings_ = locale === 'es' ? es : en;
      const s = await nightPlayer(track, value as Settings, audioBase, true);
      try {
        await press(s.tree, strings_['listen.play']);
        assert.ok(texts(s.tree).includes(strings_['listen.playFailedNetwork']), strings(s.tree));
        assert.equal(nightsRecord, null, 'a start that failed costs no night');
      } finally { await s.close(); }
    }
  } finally { (globalThis as any).__pbsPurchases.getCustomerInfo = failing; (globalThis as any).__pbsPlatform = 'web'; }
});

test('the used-week screen has one subscription line and one button', async () => {
  nightsRecord = JSON.stringify([daysAgo(10), daysAgo(2)]);
  const s = await nightPlayer(sleepTrack('psalm-night', 'en'), { ...base, journey: 'psalm-nights' });
  try {
    assert.ok(strings(s.tree).includes(en['listen.everyNight']));
    assert.ok(!strings(s.tree).includes(en['listen.paidDownload']));
  } finally { await s.close(); }
});

test('only the web preview workflow turns the preview on; no store or phone build config can', () => {
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? (e.name === 'node_modules' ? [] : walk(`${dir}/${e.name}`)) : [`${dir}/${e.name}`]);
  const configs = [...walk('../.github/workflows'), 'app.config.ts', 'package.json', ...['eas.json', 'app.json'].filter(f => existsSync(f))];
  const setters = configs.filter(file => /EXPO_PUBLIC_PBS_PREVIEW/.test(readFileSync(file, 'utf8')));
  assert.deepEqual(setters, ['../.github/workflows/mobile-preview.yml']);
  const workflow = readFileSync('../.github/workflows/mobile-preview.yml', 'utf8');
  assert.match(workflow, /expo export --platform web|preview:web/);
  assert.doesNotMatch(workflow, /eas (build|submit)/);
});

test('a topic picked behind one door never leaks into the other: no stray "More on" heading, day by day instead', async () => {
  const faith = { ...base, journey: 'psalm-nights' };
  const mindset = { ...base, door: 'mindset', journey: 'imagination-nights' };
  const heading = (topic: string) => en['declaration.inTopic'].replace('%{topic}', topic);
  const pick = async (person: object, topic: string) => {
    const tree = await asPaid(() => mount('dailyPage', person, { page: 'declaration' }));
    try { await press(tree, topic); assert.ok(strings(tree).includes(heading(topic))); } finally { await closePaid(tree); }
  };
  const other = async (person: object, stray: string) => {
    const tree = await asPaid(() => mount('dailyPage', person, { page: 'declaration' }));
    try {
      assert.ok(!strings(tree).includes(heading(stray)));
      assert.ok(!strings(tree).includes(en['declaration.inTopic'].split('%{topic}')[0].trim() + ' '));
      assert.deepEqual(checked(tree), [en['declaration.anyTopic']]);
    } finally { await closePaid(tree); }
  };
  await pick(faith, en['declaration.topic.peace']);
  await other(mindset, en['declaration.topic.peace']);
  await pick(mindset, en['declaration.topic.calm']);
  await other(faith, en['declaration.topic.calm']);
  // Back behind its own door, the saved topic still holds.
  const again = await asPaid(() => mount('dailyPage', mindset, { page: 'declaration' }));
  try { assert.ok(strings(again).includes(heading(en['declaration.topic.calm']))); } finally { await closePaid(again); }
  const reset = await asPaid(() => mount('dailyPage', mindset, { page: 'declaration' }));
  try { await press(reset, en['declaration.anyTopic']); } finally { await closePaid(reset); }
});

test('a screen that throws shows the calm error screen in the app language, and Try again retries', async () => {
  const { ErrorBoundary } = screens.root as { ErrorBoundary: (props: { error: Error; retry: () => Promise<void> }) => React.ReactElement };
  assert.equal(typeof ErrorBoundary, 'function', 'app/_layout.tsx exports the route error boundary');
  for (const locale of ['en', 'es'] as const) {
    i18n.locale = locale;
    const strings_ = locale === 'es' ? es : en;
    let retried = 0;
    let tree!: ReactTestRenderer;
    await act(async () => { tree = create(<ErrorBoundary error={new Error('boom')} retry={async () => { retried++; }} />); });
    assert.ok(texts(tree).includes(strings_['error.crash.title']));
    assert.ok(texts(tree).includes(strings_['error.crash.body']));
    assert.doesNotMatch(strings(tree), /boom|Error/, 'no internals shown');
    await press(tree, strings_['error.crash.retry']);
    assert.equal(retried, 1);
    await act(async () => tree.unmount());
  }
  i18n.locale = 'en';
});

// The daily reminder: a fake phone with a real schedule (one entry per id) and a permission that answers once.
const reminders = require('../src/reminders') as typeof import('../src/reminders');
const { REMINDER_KEY } = require('../src/reminders/reminder') as typeof import('../src/reminders/reminder');
function notificationPhone(permission: 'granted' | 'denied' | 'undetermined' = 'undetermined', answer: 'granted' | 'denied' = 'granted') {
  const status = (s: string) => ({ granted: s === 'granted', canAskAgain: s === 'undetermined', status: s });
  const phone = {
    permission, asked: 0, booked: 0, schedule: new Map<string, { content: { body: string }; trigger: object }>(),
    getPermissionsAsync: async () => status(phone.permission),
    requestPermissionsAsync: async () => { phone.asked++; phone.permission = answer; return status(answer); },
    cancelAllScheduledNotificationsAsync: async () => { phone.schedule.clear(); },
    scheduleNotificationAsync: async ({ identifier, content, trigger }: { identifier: string; content: { body: string }; trigger: object }) => {
      phone.booked++; phone.schedule.set(identifier, { content, trigger }); return identifier;
    },
  };
  (globalThis as any).__pbsNotifications = phone;
  return phone;
}
/** A fresh app open on the same phone: the saved reminder record stays, the in-memory copy and the once-per-open sync reset. */
const reopen = () => reminders.resetReminderForTests();
const settle = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
const onPhone = () => { (globalThis as any).__pbsPlatform = 'ios'; };
beforeEach(() => { reopen(); local.delete(REMINDER_KEY); notificationPhone(); });

test('the reminder offer never shows on first launch; after a finished session it does, in the journey language; "Not now" waits a week', async () => {
  onPhone();
  const person = { ...base, journey: 'psalm-nights' };
  const first = await mount('today', person);
  await settle();
  assert.ok(!strings(first).includes(en['reminder.offer.title.evening']), 'first launch: no offer');
  await act(async () => first.unmount());
  await reminders.markFirstValue();
  const after = await mount('today', person);
  await settle();
  assert.ok(strings(after).includes(en['reminder.offer.title.evening']));
  assert.ok(strings(after).includes('8:30 PM'), 'the offer names the evening time');
  assert.equal((globalThis as any).__pbsNotifications.asked, 0, 'our own pre-ask comes before the phone\'s prompt');
  await press(after, en['reminder.offer.notNow']);
  assert.ok(!strings(after).includes(en['reminder.offer.title.evening']));
  await act(async () => after.unmount());
  reopen();
  const tomorrow = await mount('today', person);
  await settle();
  assert.ok(!strings(tomorrow).includes(en['reminder.offer.title.evening']), '"Not now" holds across a reopen');
  assert.ok(JSON.parse(local.get(REMINDER_KEY)!).notNowAt > 0);
  await act(async () => tomorrow.unmount());
  reopen();
  local.set(REMINDER_KEY, JSON.stringify({ on: false, firstValueAt: 1 }));
  const spanish = await mount('today', { ...base, journey: 'mi-refugio', voice: 'spanish' });
  await settle();
  assert.ok(strings(spanish).includes(es['reminder.offer.title.evening']), 'Mi Refugio asks in Spanish');
  await act(async () => spanish.unmount());
});

test('"Turn on the reminder" asks the phone once and books exactly one daily reminder; reopening never stacks a second', async () => {
  onPhone();
  const phone = notificationPhone();
  await reminders.markFirstValue();
  const person = { ...base, journey: 'psalm-nights' };
  const today = await mount('today', person);
  await settle();
  await press(today, en['reminder.offer.yes']);
  await settle();
  assert.equal(phone.asked, 1);
  assert.deepEqual([...phone.schedule.values()].map(e => [e.trigger, e.content.body]), [[{ type: 'daily', hour: 20, minute: 30 }, en['reminder.body.evening']]]);
  assert.ok(!strings(today).includes(en['reminder.offer.title.evening']), 'the offer is gone once it is on');
  await act(async () => today.unmount());
  for (let i = 0; i < 3; i++) {
    reopen();
    const again = await mount('today', person);
    await settle();
    await act(async () => again.unmount());
  }
  assert.equal(phone.schedule.size, 1);
  assert.equal(phone.asked, 1, 'reopening never prompts');
});

test('Settings has one reminder switch and the time; off clears the schedule at once', async () => {
  onPhone();
  const phone = notificationPhone('granted');
  const settings = await mount('settings', { ...base, journey: 'psalm-nights' });
  await settle();
  const toggle = () => host(settings, 'Pressable').find(n => n.props.role === 'switch' && n.props['aria-label'] === en['reminder.settings.title'])!;
  assert.ok(toggle(), 'the switch is in Settings');
  assert.equal(toggle().props['aria-checked'], false);
  assert.ok(strings(settings).includes(en['reminder.settings.off']));
  await act(async () => toggle().props.onPress());
  await settle();
  assert.equal(toggle().props['aria-checked'], true);
  assert.ok(strings(settings).includes(i18n.t('reminder.settings.on', { locale: 'en', time: '8:30 PM' })));
  // The phone's own time picker: turning the wheel books nothing; Done reschedules once.
  const booked = phone.booked;
  await press(settings, en['reminder.settings.change']);
  const wheel = () => host(settings, 'DateTimePicker')[0];
  assert.equal(wheel().props.mode, 'time');
  for (const minute of [0, 10, 15]) await act(async () => wheel().props.onChange({ type: 'set' }, new Date(2026, 0, 1, 21, minute)));
  assert.equal(phone.booked, booked, 'turning the wheel books nothing');
  await press(settings, en['reminder.settings.done']);
  await settle();
  assert.equal(phone.booked, booked + 1, 'closing the picker reschedules once');
  assert.ok(strings(settings).includes('9:15 PM'));
  assert.deepEqual([...phone.schedule.values()].map(e => e.trigger), [{ type: 'daily', hour: 21, minute: 15 }]);
  // Opened and cancelled: nothing changes.
  await press(settings, en['reminder.settings.change']);
  await act(async () => wheel().props.onChange({ type: 'set' }, new Date(2026, 0, 1, 6, 0)));
  await press(settings, en['reminder.settings.cancel']);
  await settle();
  assert.equal(phone.booked, booked + 1);
  assert.ok(strings(settings).includes('9:15 PM'));
  await act(async () => toggle().props.onPress());
  await settle();
  assert.equal(phone.schedule.size, 0, 'off cancels every scheduled notification');
  assert.ok(!strings(settings).includes(en['reminder.settings.change']), 'the time row goes with it');
  await act(async () => settings.unmount());
});

test('a phone that says no: no crash, no second prompt, and Settings shows how to allow it there', async () => {
  onPhone();
  const phone = notificationPhone('undetermined', 'denied');
  await reminders.markFirstValue();
  const today = await mount('today', { ...base, journey: 'psalm-nights' });
  await settle();
  await press(today, en['reminder.offer.yes']);
  await settle();
  assert.equal(phone.asked, 1);
  assert.equal(phone.schedule.size, 0);
  assert.ok(!strings(today).includes(en['reminder.offer.title.evening']), 'no nagging after a no');
  await act(async () => today.unmount());
  const links: string[] = [];
  (globalThis as any).__pbsOpenURL = (url: string) => links.push(url);
  const settings = await mount('settings', { ...base, journey: 'psalm-nights' });
  await settle();
  assert.ok(strings(settings).includes(en['reminder.settings.denied']));
  const toggle = host(settings, 'Pressable').find(n => n.props.role === 'switch' && n.props['aria-label'] === en['reminder.settings.title'])!;
  await act(async () => toggle.props.onPress());
  await settle();
  assert.equal(phone.asked, 1, 'the switch re-reads the permission, it never prompts again');
  assert.equal(toggle.props['aria-checked'], false);
  await press(settings, en['reminder.settings.openPhone']);
  assert.deepEqual(links, ['app-settings:']);
  (globalThis as any).__pbsOpenURL = undefined;
  await act(async () => settings.unmount());
});

test('saying the day\'s declaration is a finished session: Today then offers the reminder', async () => {
  onPhone();
  const person = { ...base, journey: 'psalm-nights' };
  // A day no earlier test has marked, so the declaration is still unsaid.
  const unsaid = new Date(2031, 0, 15, 9);
  const page = await mount('dailyPage', person, {}, () =>
    <Daily page="declaration" now={unsaid} back={() => {}} read={() => {}} upgrade={() => {}} open={() => {}} />);
  await settle();
  await press(page, en['daily.said']);
  await settle();
  await act(async () => page.unmount());
  const today = await mount('today', person);
  await settle();
  assert.ok(strings(today).includes(en['reminder.offer.title.evening']));
  await act(async () => today.unmount());
});

test('the plain website has no reminder: no switch, no offer', async () => {
  await reminders.markFirstValue();
  const settings = await mount('settings', { ...base, journey: 'psalm-nights' });
  await settle();
  assert.ok(strings(settings).includes(en['settings.language']), 'Settings itself is drawn');
  assert.ok(!strings(settings).includes(en['reminder.settings.title']));
  await act(async () => settings.unmount());
});

test('Android uses its own time dialog: OK reschedules once, Cancel changes nothing', async () => {
  (globalThis as any).__pbsPlatform = 'android';
  const phone = notificationPhone('granted');
  local.set(REMINDER_KEY, JSON.stringify({ on: true, hour: 20, minute: 30 }));
  const settings = await mount('settings', { ...base, journey: 'psalm-nights' });
  await settle();
  const booked = phone.booked;
  await press(settings, en['reminder.settings.change']);
  await act(async () => host(settings, 'DateTimePicker')[0].props.onChange({ type: 'dismissed' }, undefined));
  assert.equal(host(settings, 'DateTimePicker').length, 0, 'the dialog closed');
  assert.equal(phone.booked, booked);
  await press(settings, en['reminder.settings.change']);
  await act(async () => host(settings, 'DateTimePicker')[0].props.onChange({ type: 'set' }, new Date(2026, 0, 1, 6, 45)));
  await settle();
  assert.equal(phone.booked, booked + 1);
  assert.deepEqual([...phone.schedule.values()].map(e => e.trigger), [{ type: 'daily', hour: 6, minute: 45 }]);
  await act(async () => settings.unmount());
});

test('the web preview falls back to a time field: typing edits, leaving the field sets the time once', async () => {
  const previous = process.env.EXPO_PUBLIC_PBS_PREVIEW;
  process.env.EXPO_PUBLIC_PBS_PREVIEW = '1';
  try {
    const settings = await mount('settings', { ...base, journey: 'psalm-nights' });
    await settle();
    const toggle = host(settings, 'Pressable').find(n => n.props.role === 'switch' && n.props['aria-label'] === en['reminder.settings.title'])!;
    await act(async () => toggle.props.onPress());
    await settle();
    const field = () => host(settings, 'input')[0];
    assert.equal(field().props.type, 'time');
    assert.equal(field().props.value, '20:30');
    await act(async () => field().props.onChange({ target: { value: '07:05' } }));
    assert.ok(strings(settings).includes('8:30 PM'), 'typing alone does not set it');
    await act(async () => field().props.onBlur());
    await settle();
    assert.ok(strings(settings).includes('7:05 AM'));
    assert.deepEqual([JSON.parse(local.get(REMINDER_KEY)!).hour, JSON.parse(local.get(REMINDER_KEY)!).minute], [7, 5]);
    await act(async () => settings.unmount());
  } finally {
    if (previous === undefined) delete process.env.EXPO_PUBLIC_PBS_PREVIEW; else process.env.EXPO_PUBLIC_PBS_PREVIEW = previous;
  }
});

test('the offer and the default follow the journey: Morning Word asks for a 7:00 AM morning reminder, Mi Refugio for an evening one, "cada noche"', async () => {
  onPhone();
  const phone = notificationPhone();
  local.set(REMINDER_KEY, JSON.stringify({ on: false, firstValueAt: 1 }));
  const morning = await mount('today', { ...base, journey: 'morning-word' });
  await settle();
  assert.ok(strings(morning).includes(en['reminder.offer.title.morning']));
  assert.ok(strings(morning).includes(reminders.formatTime({ hour: 7, minute: 0 }, 'en')));
  assert.ok(!strings(morning).includes(en['reminder.offer.title.evening']));
  await press(morning, en['reminder.offer.yes']);
  await settle();
  assert.deepEqual([...phone.schedule.values()].map(e => [e.trigger, e.content.body]), [[{ type: 'daily', hour: 7, minute: 0 }, en['reminder.body.morning']]]);
  await act(async () => morning.unmount());
  reopen();
  local.set(REMINDER_KEY, JSON.stringify({ on: false, firstValueAt: 1 }));
  const refugio = await mount('today', { ...base, journey: 'mi-refugio', voice: 'spanish' });
  await settle();
  assert.ok(strings(refugio).includes(es['reminder.offer.title.evening']) && es['reminder.offer.title.evening'].includes('cada noche'));
  assert.ok(strings(refugio).includes(reminders.formatTime({ hour: 20, minute: 30 }, 'es')));
  await act(async () => refugio.unmount());
});
