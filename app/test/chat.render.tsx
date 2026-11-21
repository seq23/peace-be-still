// The Chat tab, rendered with the app's real providers (settings, purchases, router recorder).
import React from 'react';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { create, act, ReactTestRenderer } from 'react-test-renderer';
import type { ChatResponse } from '../src/chat/contract';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const quiet = console.error;
console.error = (...args: unknown[]) => { if (!String(args[0]).includes('react-test-renderer is deprecated')) quiet(...args); };
const store = new Map<string, string>();
(globalThis as any).__pbsStorage = { getItem: async (k: string) => store.get(k) ?? null, setItem: async (k: string, v: string) => { store.set(k, v); }, removeItem: async (k: string) => { store.delete(k); } };
(globalThis as any).__pbsOpenURL = (url: string) => (globalThis as any).__pbsOpened?.push(url);
const pushed: unknown[] = [];
(globalThis as any).__pbsRouter = { push: (h: unknown) => pushed.push(h), replace() {}, navigate() {}, back() {}, canGoBack: () => false };
// Paid or not comes from the store, exactly as on a phone.
let storePaid = false;
const info = () => ({ entitlements: { active: storePaid ? { paid: { isActive: true } } : {} } });
(globalThis as any).__pbsExpoConfig = { extra: { revenueCatIosKey: 'render-test-key' } };
(globalThis as any).__pbsPurchases = { configure() {}, getAppUserID: async () => 'iid-1', logIn: async () => ({ customerInfo: info() }), getOfferings: async () => ({ current: null }), getCustomerInfo: async () => info(), addCustomerInfoUpdateListener() {}, removeCustomerInfoUpdateListener() {} };
(globalThis as any).__pbsPlatform = 'ios';
const { SettingsProvider, useSettings } = require('../src/settings');
const { PurchasesProvider } = require('../src/purchases/provider');
const Chat = require('../app/(tabs)/chat').default;
const { FREE_CONSENT_KEY, FIRST_HAD_KEY } = require('../src/chat/ChatScreen');
const { FREE_CHAT_MESSAGES, PAID_CHAT_MESSAGES } = require('../src/gates') as typeof import('../src/gates');
const en = require('../src/i18n/en.json') as Record<string, string>;

const replies: Array<ChatResponse | 'offline' | 500> = [];
const sent: any[] = [];
const reports: any[] = [];
const firstAsks: any[] = [];
let firstAnswer: boolean | 'down' = false;
(globalThis as any).fetch = async (url: string, init: any) => {
  if (url.endsWith('/token')) { store.set('peace-be-still-chat-token', JSON.stringify({ token: 'aaaaaaaaaaaa.bbbbbbbbbbbb', age: 'adult', installId: 'iid-1' })); return new Response(JSON.stringify({ token: 'aaaaaaaaaaaa.bbbbbbbbbbbb', installId: 'iid-1' })); }
  if (url.endsWith('/report')) { reports.push(JSON.parse(init.body)); return new Response(JSON.stringify({ reported: true })); }
  // The Worker's word on the private first chat (no by default: the normal free chat).
  if (url.endsWith('/chat/first')) { firstAsks.push(JSON.parse(init.body)); if (firstAnswer === 'down') throw new TypeError('Network request failed'); return new Response(JSON.stringify({ private: firstAnswer === true })); }
  sent.push(JSON.parse(init.body));
  const next = replies.shift() as ChatResponse | 'offline' | 500;
  if (next === 'offline') throw new TypeError('Network request failed');
  if (next === 500) return new Response('{}', { status: 500 });
  return new Response(JSON.stringify(next));
};
const texts = (tree: ReactTestRenderer) => tree.root.findAll(n => (n.type as unknown) === 'Text').map(n => n.children.filter(x => typeof x === 'string').join('')).join(' | ');
const adult = { door: 'faith', age: 'adult', ageSetAt: 0, voice: 'church', language: 'en', journey: 'hush-harbor' } as const;
async function mount(settings: object = adult) {
  store.set('peace-be-still-settings', JSON.stringify(settings));
  const Ready = () => (useSettings().ready ? <PurchasesProvider><Chat /></PurchasesProvider> : null);
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<SettingsProvider><Ready /></SettingsProvider>); });
  return tree;
}
const consented = () => { store.set('peace-be-still-chat-disclosure', 'yes'); store.set(FREE_CONSENT_KEY, 'yes'); };
async function say(tree: ReactTestRenderer, text: string, label = 'Send') {
  await act(async () => tree.root.findByType('TextInput' as any).props.onChangeText(text));
  await act(async () => tree.root.findByProps({ accessibilityLabel: label }).props.onPress());
}
const answer = (over: Partial<ChatResponse> = {}): ChatResponse => ({ kind: 'answer', ai: true, text: 'You are not carrying this by yourself.', scripture: [{ ref: 'Philippians 4:19', translation: 'KJV', text: 'But my God shall supply all your need according to his riches in glory by Christ Jesus.', book: 'PHI', chapter: 4, verse: 19 }], remaining: 9, limit: 10, reminder: false, ...over });

test('free chat asks once, in plain words, before the first free chat; her yes is stored and sent', async () => {
  store.clear(); storePaid = false;
  const tree = await mount();
  assert.match(texts(tree), /may keep and use what you type to improve its AI, and people there may read it/);
  assert.match(texts(tree), /Paid chat is private\./);
  assert.equal(tree.root.findAllByType('TextInput' as any).length, 0);
  await act(async () => tree.root.findAllByProps({ testID: 'free-private' })[0].props.onPress());
  assert.deepEqual(pushed.at(-1), '/paid');
  await act(async () => tree.root.findAllByProps({ testID: 'free-continue' })[0].props.onPress());
  assert.equal(store.get(FREE_CONSENT_KEY), 'yes');
  replies.push(answer());
  await say(tree, 'hello');
  assert.equal(sent.at(-1).freeConsent, true);
  assert.doesNotMatch(texts(await mount()), /may keep and use/);
});

test('the consent screen speaks Spanish in Mi Refugio', async () => {
  store.clear(); storePaid = false;
  const tree = await mount({ ...adult, journey: 'mi-refugio', voice: 'spanish', language: 'es' });
  assert.match(texts(tree), /puede guardar y usar lo que escribes/);
  assert.match(texts(tree), /Seguir con el chat gratis/);
  assert.match(texts(tree), /Hacer privado el chat/);
});

test('paid chat never shows the free-chat consent and never sends freeConsent', async () => {
  store.clear(); storePaid = true;
  const tree = await mount();
  assert.doesNotMatch(texts(tree), /may keep and use/);
  assert.match(texts(tree), /Your chat is private/);
  await act(async () => tree.root.findAllByType('Pressable' as any)[0].props.onPress());
  replies.push(answer());
  await say(tree, 'hello');
  assert.equal(sent.at(-1).freeConsent, undefined);
  storePaid = false;
});

test('when the server asks for consent again, the consent screen comes back', async () => {
  store.clear(); consented(); storePaid = false;
  replies.push({ kind: 'consent', ai: false, text: '', scripture: [], remaining: null, limit: null, reminder: false });
  const tree = await mount();
  await say(tree, 'hello');
  assert.match(texts(tree), /may keep and use/);
  assert.equal(store.get(FREE_CONSENT_KEY), undefined);
});

test('a paused account stops sending', async () => {
  consented();
  replies.push({ kind: 'paused', ai: false, text: 'Chat is paused on this account.', scripture: [], remaining: null, limit: null, reminder: false });
  const tree = await mount();
  await say(tree, 'hello');
  assert.equal(tree.root.findByType('TextInput' as any).props.editable, false);
});

test('the free day\'s last message gets its full answer, then what a plan adds at the store\'s monthly price and when the free ones come back', async () => {
  consented(); storePaid = false;
  const products = require('../src/config/products.json');
  const pkg = (plan: 'monthly' | 'yearly', id: string, period: string, price: string) => ({ identifier: id, product: { identifier: products.products[plan].id, subscriptionPeriod: period, priceString: price, introPrice: null } });
  const real = (globalThis as any).__pbsPurchases.getOfferings;
  (globalThis as any).__pbsPurchases.getOfferings = async () => ({ current: { identifier: products.offering, availablePackages: [pkg('monthly', '$rc_monthly', 'P1M', '$7.99'), pkg('yearly', '$rc_annual', 'P1Y', '$39.99')] } });
  try {
    replies.push(answer({ remaining: 0, limit: FREE_CHAT_MESSAGES }));
    const tree = await mount();
    await say(tree, 'the last free one');
    assert.match(texts(tree), /You are not carrying this by yourself/); // the answer itself, whole
    assert.match(texts(tree), new RegExp(en['chat.limit.upgrade'].replace('%{price}', '\\$7\\.99').replace('?', '\\?')));
    assert.match(texts(tree), new RegExp(en['chat.limit.tomorrow'].replace('%{count}', String(FREE_CHAT_MESSAGES))));
    pushed.length = 0;
    await act(async () => tree.root.findAllByProps({ testID: 'limit-upgrade' })[0].props.onPress());
    assert.deepEqual(pushed, ['/paid']);
  } finally { (globalThis as any).__pbsPurchases.getOfferings = real; }
  // A message with free ones left shows no prompt.
  replies.push(answer({ remaining: 2, limit: FREE_CHAT_MESSAGES }));
  const other = await mount();
  await say(other, 'hello');
  assert.equal(other.root.findAllByProps({ testID: 'limit-upgrade' }).length, 0);
});

test('the private first chat: the Worker says yes (with the iPhone\'s DeviceCheck token), so no free-chat screen; labelled private; sent without free consent', async () => {
  store.clear(); storePaid = false; store.set('peace-be-still-chat-disclosure', 'yes');
  (globalThis as any).__pbsPlatform = 'ios';
  (globalThis as any).__pbsNative = { PBSDeviceCheck: { token: async () => 'devicecheck-token-from-apple' } };
  firstAnswer = true; firstAsks.length = 0;
  try {
    replies.push(answer({ firstPrivate: true, remaining: FREE_CHAT_MESSAGES - 1, limit: FREE_CHAT_MESSAGES }));
    const tree = await mount();
    assert.equal(tree.root.findAllByProps({ testID: 'free-consent' }).length, 0);
    assert.match(texts(tree), new RegExp(en['chat.firstPrivate']));
    assert.equal(firstAsks.at(-1).deviceCheck, 'devicecheck-token-from-apple');
    await say(tree, 'my first question');
    assert.notEqual(sent.at(-1).freeConsent, true); // the Worker decides; the app never claims consent it was not given
    assert.equal(store.get(FIRST_HAD_KEY), 'yes');
  } finally { firstAnswer = false; delete (globalThis as any).__pbsNative; }
});

test('the private first chat ends (the private route failed, or the cap): the free-chat screen comes back before anything else is sent, naming what she had', async () => {
  store.clear(); storePaid = false; store.set('peace-be-still-chat-disclosure', 'yes');
  firstAnswer = true;
  try {
    replies.push(answer({ firstPrivate: true }), { kind: 'consent', ai: false, text: 'Free chat needs your yes.', scripture: [], remaining: null, limit: null, reminder: false });
    const tree = await mount();
    await say(tree, 'one');
    const before = sent.length;
    await say(tree, 'two');
    assert.equal(sent.length, before + 1);
    assert.ok(tree.root.findAllByProps({ testID: 'free-consent' }).length > 0);
    assert.match(texts(tree), new RegExp(en['chat.limit.firstPrivateNoPrice'].replace('.', '\\.')));
  } finally { firstAnswer = false; }
});

test('once the private first chat is over, the next message starts a new conversation carrying none of its turns', async () => {
  store.clear(); storePaid = false; store.set('peace-be-still-chat-disclosure', 'yes');
  firstAnswer = true;
  try {
    replies.push(answer({ firstPrivate: true }), { kind: 'consent', ai: false, text: 'Free chat needs your yes.', scripture: [], remaining: null, limit: null, reminder: false }, answer());
    const tree = await mount();
    await say(tree, 'My brother Marcus stopped talking to me');
    const firstId = sent.at(-1).conversation;
    await say(tree, 'Marcus again');
    firstAnswer = false;
    await act(async () => tree.root.findAllByProps({ testID: 'free-continue' })[0].props.onPress());
    await say(tree, 'Today I want to try again');
    const last = sent.at(-1);
    assert.notEqual(last.conversation, firstId);
    assert.deepEqual(last.messages.map((m: { text: string }) => m.text), ['Today I want to try again']);
    assert.equal(last.freeConsent, true);
  } finally { firstAnswer = false; }
});

test('no private first chat (web, Android, a reinstall, the Worker unreachable): the normal free-chat screen first', async () => {
  for (const answerIs of [false, 'down'] as const) {
    store.clear(); storePaid = false; store.set('peace-be-still-chat-disclosure', 'yes');
    firstAnswer = answerIs;
    const tree = await mount();
    assert.ok(tree.root.findAllByProps({ testID: 'free-consent' }).length > 0, String(answerIs));
    assert.equal(tree.root.findAllByProps({ testID: 'first-private' }).length, 0);
  }
  firstAnswer = false;
});

const overflowAsk = (): ChatResponse => ({ kind: 'overflow_consent', ai: false, text: `You've used today's ${PAID_CHAT_MESSAGES} private messages. You can keep chatting with our free AI. Free chat isn't private: the free service may keep and use what you send. Private chat comes back tomorrow.`, scripture: [], remaining: null, limit: null, reminder: false });
test('after her private messages: the choice appears, her typed message is kept and sent on free chat only after "Keep chatting", labelled not private', async () => {
  store.clear(); storePaid = true; store.set('peace-be-still-chat-disclosure', 'yes');
  replies.push(overflowAsk(), answer({ notPrivate: true, remaining: null, limit: null }));
  const tree = await mount();
  const before = sent.length;
  await say(tree, 'Please pray with me about my mother tonight.');
  assert.equal(sent.length, before + 1);
  assert.equal(sent.at(-1).overflowConsent, undefined); // nothing goes to free chat before her yes
  assert.match(texts(tree), /Free chat isn't private/);
  assert.equal(tree.root.findAllByProps({ testID: 'answer-not-private' }).length, 0);
  await act(async () => tree.root.findAllByProps({ testID: 'overflow-continue' })[0].props.onPress());
  assert.equal(sent.length, before + 2);
  assert.equal(sent.at(-1).overflowConsent, true);
  assert.deepEqual(sent.at(-1).messages.map((m: { text: string }) => m.text), ['Please pray with me about my mother tonight.']); // the same message, never retyped
  assert.equal(tree.root.findAllByType('TextInput' as any)[0].props.value, '');
  assert.ok(tree.root.findAllByProps({ testID: 'answer-not-private' }).length > 0);
  assert.match(texts(tree), /Free chat \(not private\)/);
  assert.match(store.get('peace-be-still-chat-overflow-day') ?? '', /\d{4}/); // asked once today
  storePaid = false;
});
test('"Wait until tomorrow" sends nothing, and chat stays open for anything urgent', async () => {
  store.clear(); storePaid = true; store.set('peace-be-still-chat-disclosure', 'yes');
  replies.push(overflowAsk());
  const tree = await mount();
  await say(tree, 'One more question about Psalm 23.');
  const before = sent.length;
  await act(async () => tree.root.findAllByProps({ testID: 'overflow-wait' })[0].props.onPress());
  assert.equal(sent.length, before);
  assert.equal(tree.root.findAllByProps({ testID: 'overflow-continue' }).length, 0);
  assert.equal(tree.root.findByType('TextInput' as any).props.editable, true);
  assert.equal(store.get('peace-be-still-chat-overflow-day'), undefined);
  storePaid = false;
});

test('every AI answer carries the AI label, the stored verse and "N of 10 messages left today"', async () => {
  consented();
  replies.push(answer(), answer({ remaining: 8 }));
  const tree = await mount();
  await say(tree, "I'm scared about rent this month.");
  await say(tree, 'Thank you.');
  assert.equal(tree.root.findAllByType('Text' as any).filter(n => n.props.testID === 'ai-label').length, 2);
  assert.match(texts(tree), /PHILIPPIANS 4:19 · KJV|Philippians 4:19 · KJV/);
  assert.match(texts(tree), /8 of 10 messages left today/);
  assert.equal(sent.at(-1).door, 'faith');
  assert.equal(sent.at(-1).messages.length, 3); // her two turns and the AI answer between them
});

test('the chat request carries the journey\'s voice: Bible Chat & Stories sends plain (even after Hush Harbor), Hush Harbor sends church', async () => {
  const { chooseJourney } = require('../src/model') as typeof import('../src/model');
  for (const [journey, voice] of [['bible-chat', 'plain'], ['hush-harbor', 'church']] as const) {
    store.clear(); storePaid = false; consented();
    replies.push(answer());
    const tree = await mount(chooseJourney({ ...adult, voice: journey === 'bible-chat' ? 'church' : 'plain' }, journey));
    await say(tree, 'I keep worrying about my mother.');
    assert.equal(sent.at(-1).voice, voice, journey);
    assert.equal(sent.at(-1).journey, journey);
    assert.equal(sent.at(-1).language, 'en');
  }
});

test('the crisis reply is not labelled AI and its numbers are tappable', async () => {
  consented();
  replies.push({ kind: 'crisis', ai: false, text: "You matter, and you don't have to carry this alone. Call or text 988. The National Domestic Violence Hotline: 1-800-799-7233.", scripture: [], remaining: null, limit: null, reminder: false, crisis: 'abuse' });
  const tree = await mount();
  await say(tree, 'he hits me');
  assert.equal(tree.root.findAllByType('Text' as any).filter(n => n.props.testID === 'ai-label').length, 0);
  const links = tree.root.findAllByType('Pressable' as any).filter(n => n.props.accessibilityRole === 'link');
  (globalThis as any).__pbsOpened = [];
  for (const l of links) await act(async () => l.props.onPress());
  assert.deepEqual((globalThis as any).__pbsOpened, ['tel:18007997233', 'sms:88788?body=START', 'tel:988', 'sms:988']); // the hotline the reply leads with comes first
});

test('offline or a server error on a crisis message still shows the crisis line, as one quiet line of links, by region, EN and ES', async () => {
  consented();
  const opened = async (tree: ReactTestRenderer) => {
    (globalThis as any).__pbsOpened = [];
    for (const l of tree.root.findAll(n => n.props.accessibilityRole === 'link' && (n.type as unknown) === 'Text')) await act(async () => l.props.onPress());
    return (globalThis as any).__pbsOpened;
  };
  // The error path is calm: no Call/Text buttons (those belong to a real crisis reply), one muted line.
  const calm = (tree: ReactTestRenderer) => {
    assert.equal(tree.root.findAll(n => (n.type as unknown) === 'Pressable' && n.props.accessibilityRole === 'link').length, 0);
    const help = tree.root.findAll(n => (n.type as unknown) === 'Text' && n.props.testID === 'note-help');
    assert.equal(help.length, 1);
    assert.notEqual(help[0].props.style.flat().find((x: any) => x?.color)?.color, undefined);
    assert.equal(help[0].props.style.flat().some((x: any) => x?.textAlign === 'center'), false);
  };
  replies.push('offline');
  let tree = await mount();
  await say(tree, "I don't want to be alive anymore");
  assert.match(texts(tree), /couldn't reach us/);
  const flat = (n: any): string => n.children.map((x: any) => typeof x === 'string' ? x : flat(x)).join('');
  const help = tree.root.findAll(n => (n.type as unknown) === 'Text' && n.props.testID === 'note-help');
  assert.match(texts(tree), /couldn't reach us[\s\S]*If you're in danger/); // the error line, then the help line
  assert.equal(flat(help[0]), "If you're in danger, call or text 988.");
  calm(tree);
  assert.deepEqual(await opened(tree), ['tel:988', 'sms:988']);
  (globalThis as any).__pbsRegion = 'MX'; (globalThis as any).__pbsLocale = 'es';
  try {
    replies.push(500);
    tree = await mount({ ...adult, voice: 'spanish', language: 'es' });
    await say(tree, 'ya no quiero vivir', 'Enviar');
    assert.match(texts(tree), /Línea de la Vida al 800 911 2000/);
    calm(tree);
    assert.deepEqual(await opened(tree), ['tel:8009112000', 'tel:911']);
  } finally { (globalThis as any).__pbsRegion = undefined; (globalThis as any).__pbsLocale = undefined; }
});

test('every region\'s help line, EN and ES, has exactly one [link] per number it offers', () => {
  const { regionHelp } = require('../src/chat/ChatScreen');
  const es = require('../src/i18n/es.json') as Record<string, string>;
  for (const region of ['US', 'MX', 'ES', 'FR', null]) {
    const help = regionHelp(region);
    for (const strings of [en, es]) assert.equal((strings[help.text].match(/\[[^\]]+\]/g) ?? []).length, help.links.length, `${region} ${help.text}`);
  }
});

test('the composer shows focus on its pill border, never the browser outline on web', async () => {
  consented();
  (globalThis as any).__pbsPlatform = 'web';
  try {
    const tree = await mount();
    const input = tree.root.findByType('TextInput' as any);
    assert.equal(input.props.style.flat().some((x: any) => x?.outlineStyle === 'none'), true);
    const border = () => tree.root.findAll(n => (n.type as unknown) === 'View' && n.props.testID === 'composer')[0].props.style.flat().reduce((a: any, x: any) => ({ ...a, ...x }), {}).borderColor;
    const rest = border();
    await act(async () => input.props.onFocus());
    assert.notEqual(border(), rest);
    await act(async () => input.props.onBlur());
    assert.equal(border(), rest);
  } finally { (globalThis as any).__pbsPlatform = 'ios'; }
});

test('when the free models are out, the kind message shows and sending stops', async () => {
  consented();
  replies.push({ kind: 'no_free_model', ai: false, text: 'Chat is resting until tomorrow.', scripture: [], remaining: null, limit: null, reminder: false });
  const tree = await mount();
  await say(tree, 'hello');
  assert.match(texts(tree), /resting until tomorrow/);
  assert.equal(tree.root.findByType('TextInput' as any).props.editable, false);
});

test('"busy" (a model failed for a moment) keeps chat open; a token refused on this network says so', async () => {
  consented();
  replies.push({ kind: 'busy', ai: false, text: 'Chat is busy for a moment. Give it a minute and send that again.', scripture: [], remaining: 10, limit: 10, reminder: false });
  const tree = await mount();
  await say(tree, 'hello');
  assert.match(texts(tree), /Give it a minute/);
  assert.equal(tree.root.findByType('TextInput' as any).props.editable, true);
});

test('an expired token is renewed for the same install id, never replaced', async () => {
  const { sendChat, installId } = require('../src/chat/api');
  store.set('peace-be-still-chat-token', JSON.stringify({ token: 'old.tokenaaaaaa', age: 'adult', installId: 'iid-1' }));
  const calls: string[] = [];
  const fetcher = async (url: string, init: any) => {
    calls.push(url.replace(/^.*\/api/, ''));
    if (url.endsWith('/token/renew')) { assert.equal(init.headers.authorization, 'Bearer old.tokenaaaaaa'); return new Response(JSON.stringify({ token: 'new.tokenbbbbbb', installId: 'iid-1' })); }
    if (url.endsWith('/token')) throw new Error('a new install id must not be made');
    if (init.headers.authorization === 'Bearer old.tokenaaaaaa') return new Response('{}', { status: 401 });
    return new Response(JSON.stringify({ kind: 'answer', ai: true, text: 'ok', scripture: [], remaining: 9, limit: 10, reminder: false }));
  };
  const res = await sendChat({ ...adult }, 'c', [{ role: 'user', text: 'hi' }], fetcher);
  assert.equal(res.kind, 'answer');
  assert.deepEqual(calls, ['/chat', '/token/renew', '/chat']);
  assert.equal(await installId(), 'iid-1');
});

test('"Chat memory deleted." only after the server confirms; a 401 is a failure', async () => {
  const { deleteChatMemory } = require('../src/chat/api');
  store.set('peace-be-still-chat-token', JSON.stringify({ token: 'old.tokenaaaaaa', age: 'adult', installId: 'iid-1' }));
  await assert.rejects(deleteChatMemory(async () => new Response('{}', { status: 401 })));
  await assert.rejects(deleteChatMemory(async () => new Response('{}', { status: 500 })));
  await deleteChatMemory(async () => new Response(JSON.stringify({ deleted: true })));
});

test('a child gets no chat, even by a typed link', async () => {
  const tree = await mount({ ...adult, age: 'child', journey: 'psalm-nights' });
  assert.equal(tree.root.findAll(n => (n.type as unknown) === 'Redirect').length, 1);
});

test('every AI answer can be reported: the answer and a reason are sent, never her message (Apple 1.2)', async () => {
  consented();
  replies.push(answer(), { kind: 'crisis', ai: false, text: 'Call or text 988.', scripture: [], remaining: null, limit: null, reminder: false, crisis: 'selfharm' });
  const tree = await mount();
  await say(tree, 'HER-WORDS rent is due');
  assert.equal(tree.root.findAllByProps({ testID: 'report-answer' }).filter(n => (n.type as unknown) === 'Pressable').length, 1);
  await act(async () => tree.root.findAllByProps({ testID: 'report-answer' })[0].props.onPress());
  assert.match(texts(tree), /What is wrong with it\?/);
  await act(async () => tree.root.findAllByProps({ testID: 'report-wrong' })[0].props.onPress());
  assert.deepEqual(reports.at(-1), { answer: 'You are not carrying this by yourself.', reason: 'wrong' });
  assert.doesNotMatch(JSON.stringify(reports), /HER-WORDS/);
  // F10: nothing reads reports yet, so the copy only says it was sent.
  assert.match(texts(tree), /Thank you\. Your report was sent\./);
  assert.doesNotMatch(texts(tree), /person will read/i);
  await say(tree, 'I want to die');
  assert.equal(tree.root.findAllByProps({ testID: 'report-answer' }).filter(n => (n.type as unknown) === 'Pressable').length, 0); // the crisis reply is not an AI answer
});

test('the report action speaks Spanish in Mi Refugio', async () => {
  consented();
  replies.push(answer({ text: 'No cargas esto sin compañía.' }));
  const tree = await mount({ ...adult, journey: 'mi-refugio', voice: 'spanish', language: 'es' });
  await say(tree, 'tengo miedo', 'Enviar');
  assert.match(texts(tree), /Reportar esta respuesta/);
});

test('the report picker can be cancelled without sending anything', async () => {
  consented();
  replies.push(answer());
  const tree = await mount();
  await say(tree, 'rent is due');
  const sent = reports.length;
  await act(async () => tree.root.findAllByProps({ testID: 'report-answer' })[0].props.onPress());
  await act(async () => tree.root.findAllByProps({ testID: 'report-cancel' })[0].props.onPress());
  assert.equal(reports.length, sent);
  assert.doesNotMatch(texts(tree), /What is wrong with it\?/);
  assert.equal(tree.root.findAllByProps({ testID: 'report-answer' }).filter(n => (n.type as unknown) === 'Pressable').length, 1);
});

test('the Mindset chat shows no faith words: no KJV, verse, pastor or God (hostile review F8)', async () => {
  for (const [locale, language] of [['en', 'en'], ['es', 'es']] as const) {
    store.delete('peace-be-still-chat-disclosure'); store.delete(FREE_CONSENT_KEY);
    const settings = { door: 'mindset', age: 'adult', ageSetAt: 0, voice: 'plain', language, journey: 'imagination-nights' };
    let tree = await mount(settings);
    assert.doesNotMatch(texts(tree), /KJV|King James|verse|versículo|pastor|\bGod\b|\bDios\b/i);
    consented();
    replies.push(answer({ text: 'Breathe out slowly. Tomorrow can wait its turn.', scripture: [] }));
    tree = await mount(settings);
    assert.doesNotMatch(texts(tree), /KJV|King James|verse|versículo|pastor|\bGod\b|\bDios\b/i);
    await act(async () => tree.root.findByType('TextInput' as any).props.onChangeText('I cannot sleep'));
    await act(async () => tree.root.findByProps({ accessibilityLabel: locale === 'es' ? 'Enviar' : 'Send' }).props.onPress());
    assert.match(texts(tree), /Tomorrow can wait/);
    assert.doesNotMatch(texts(tree), /KJV|King James|verse|versículo|pastor|\bGod\b|\bDios\b/i);
  }
});

test('a crisis reply shows the check-in first and the card at once; the phone region travels; the check-in is in her history', async () => {
  consented(); storePaid = false;
  (globalThis as any).__pbsRegion = 'MX';
  replies.push({ kind: 'crisis', ai: false, text: 'Tú importas. Por favor, llama a la Línea de la Vida al 800 911 2000, gratis, a cualquier hora. Si estás en peligro ahora mismo, llama al 911.', checkIn: { text: 'Parece que estás cargando algo muy pesado. ¿Estás a salvo ahora mismo?', ai: false }, scripture: [], remaining: null, limit: null, reminder: false, crisis: 'selfharm' });
  const tree = await mount({ ...adult, journey: 'mi-refugio', voice: 'spanish', language: 'es' });
  await say(tree, 'me quiero morir', 'Enviar');
  assert.equal(sent.at(-1).region, 'MX');
  const shown = texts(tree);
  assert.ok(shown.indexOf('¿Estás a salvo ahora mismo?') < shown.indexOf('800 911 2000'));
  (globalThis as any).__pbsOpened = [];
  for (const l of tree.root.findAll(n => (n.type as unknown) === 'Pressable' && n.props.accessibilityRole === 'link')) await act(async () => l.props.onPress());
  assert.deepEqual((globalThis as any).__pbsOpened, ['tel:8009112000', 'tel:911']);
  replies.push(answer({ text: 'Gracias por decírmelo.' }));
  await say(tree, 'no sé', 'Enviar');
  assert.deepEqual(sent.at(-1).messages.map((m: any) => m.role), ['user', 'assistant', 'user']);
  assert.match(sent.at(-1).messages[1].text, /a salvo/);
  (globalThis as any).__pbsRegion = 'US';
});
