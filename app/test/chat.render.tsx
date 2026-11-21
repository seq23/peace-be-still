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
const { FREE_CONSENT_KEY } = require('../src/chat/ChatScreen');

const replies: ChatResponse[] = [];
const sent: any[] = [];
const reports: any[] = [];
(globalThis as any).fetch = async (url: string, init: any) => {
  if (url.endsWith('/token')) { store.set('peace-be-still-chat-token', JSON.stringify({ token: 'aaaaaaaaaaaa.bbbbbbbbbbbb', age: 'adult', installId: 'iid-1' })); return new Response(JSON.stringify({ token: 'aaaaaaaaaaaa.bbbbbbbbbbbb', installId: 'iid-1' })); }
  if (url.endsWith('/report')) { reports.push(JSON.parse(init.body)); return new Response(JSON.stringify({ reported: true })); }
  sent.push(JSON.parse(init.body));
  return new Response(JSON.stringify(replies.shift()));
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

test('a paused account and the fair-use pause stop sending; fair use offers the private chat', async () => {
  for (const kind of ['paused', 'fair_use'] as const) {
    consented();
    replies.push({ kind, ai: false, text: kind === 'paused' ? 'Chat is paused on this account.' : "You've reached this month's chat limit; it resets on December 1.", scripture: [], remaining: null, limit: null, reminder: false });
    const tree = await mount();
    await say(tree, 'hello');
    assert.equal(tree.root.findByType('TextInput' as any).props.editable, false);
    assert.equal(/Make chat private/.test(texts(tree)), kind === 'fair_use');
  }
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
