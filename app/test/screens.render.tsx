// The real screens and layouts, rendered (test/support/render-build.mjs supplies host primitives and an
// expo-router recorder). Each test drives a screen the way a person would and checks what is shown, what is
// saved and where the app goes next.
import React from 'react';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { displayRuns, formatReference, parseReference } from '../src/bible/core';
import { mindsetDeclarations, mindsetTopics, plans } from '../src/screens/daily/content';
import { byTopic, dailyDeclaration, pastStories, shelf, storyFor, tellingFor, topics } from '../src/content';
import type { DailyPage } from '../src/screens/daily/Daily';
import { test, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { create, act, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import products from '../src/config/products.json';
import { dayKey, faithContentIssues, RAISE_WAIT_MS, type JourneyId, type Settings } from '../src/model';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const quiet = console.error;
console.error = (...args: unknown[]) => { if (!String(args[0]).includes('react-test-renderer is deprecated')) quiet(...args); };
let saved: string | null = null;
let readFails = false;
let chatRecord: string | null = null;
const fakePurchaseCalls: string[] = [];
let listeners = new Set<(info: ReturnType<typeof customerInfo>) => void>();
const customerInfo = (paid: boolean) => ({
  entitlements: { active: paid ? { paid: { isActive: true } } : {} },
});
let storePaid = false;
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
  getCustomerInfo: async () => customerInfo(storePaid),
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
    return key === 'peace-be-still-settings' ? saved : local.get(key) ?? null;
  },
  setItem: async (key: string, value: string) => {
    if (key === 'peace-be-still-chat-token') chatRecord = value;
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
  more: require('../app/(tabs)/more').default,
  settings: require('../app/settings').default,
  paid: require('../app/paid').default,
  notFound: require('../app/+not-found').default,
};
type Name = Exclude<keyof typeof screens, 'root'>;

const base: Settings = { door: 'faith', age: 'adult', ageSetAt: 0, voice: 'plain', language: 'en' };
const store = () => JSON.parse(saved!) as Settings;

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
