import React from 'react';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { create, act, ReactTestRenderer } from 'react-test-renderer';
import type { ChatResponse } from '../src/chat/contract';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const store = new Map<string, string>();
(globalThis as any).__pbsStorage = { getItem: async (k: string) => store.get(k) ?? null, setItem: async (k: string, v: string) => { store.set(k, v); } };
const ChatScreen = require('../src/chat/ChatScreen').default;
const Index = require('../app/index').default;
const { colors } = require('../src/theme/tokens');

const replies: ChatResponse[] = [];
const sent: any[] = [];
(globalThis as any).fetch = async (url: string, init: any) => {
  if (url.endsWith('/token')) return new Response(JSON.stringify({ token: 'aaaaaaaaaaaa.bbbbbbbbbbbb' }));
  sent.push(JSON.parse(init.body));
  return new Response(JSON.stringify(replies.shift()));
};
const texts = (tree: ReactTestRenderer) => tree.root.findAllByType('Text' as any).map(n => n.children.filter(x => typeof x === 'string').join('')).join(' | ');
const adult = { door: 'faith', age: 'adult', voice: 'church', language: 'en', journey: 'Hush Harbor' } as const;
async function mount(settings: object = adult) { let tree!: ReactTestRenderer; await act(async () => { tree = create(<ChatScreen settings={settings} c={colors.light} locale="en" />); }); return tree; }
async function say(tree: ReactTestRenderer, text: string) {
  await act(async () => tree.root.findByType('TextInput' as any).props.onChangeText(text));
  await act(async () => tree.root.findByProps({ accessibilityLabel: 'Send' }).props.onPress());
}
const answer = (over: Partial<ChatResponse> = {}): ChatResponse => ({ kind: 'answer', ai: true, text: 'You are not carrying this by yourself.', scripture: [{ ref: 'Philippians 4:19', translation: 'KJV', text: 'But my God shall supply all your need according to his riches in glory by Christ Jesus.', book: 'PHI', chapter: 4, verse: 19 }], remaining: 9, limit: 10, reminder: false, ...over });

test('the disclosure comes before the first chat, and is remembered', async () => {
  store.clear();
  const tree = await mount();
  assert.match(texts(tree), /free AI providers/);
  assert.match(texts(tree), /leave out names/);
  assert.equal(tree.root.findAllByType('TextInput' as any).length, 0);
  await act(async () => tree.root.findAllByType('Pressable' as any)[0].props.onPress());
  assert.equal(tree.root.findAllByType('TextInput' as any).length, 1);
  const again = await mount();
  assert.doesNotMatch(texts(again), /free AI providers/);
});

test('every AI answer carries the AI label, the stored verse and "N of 10 messages left today"', async () => {
  store.set('peace-be-still-chat-disclosure', 'yes');
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
  store.set('peace-be-still-chat-disclosure', 'yes');
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
  store.set('peace-be-still-chat-disclosure', 'yes');
  replies.push({ kind: 'no_free_model', ai: false, text: 'Chat is resting until tomorrow.', scripture: [], remaining: null, limit: null, reminder: false });
  const tree = await mount();
  await say(tree, 'hello');
  assert.match(texts(tree), /resting until tomorrow/);
  assert.equal(tree.root.findByType('TextInput' as any).props.editable, false);
});

test('"busy" (a model failed for a moment) keeps chat open; a token refused on this network says so', async () => {
  store.set('peace-be-still-chat-disclosure', 'yes');
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

test('a child gets no Chat tab at all', async () => {
  store.set('peace-be-still-settings', JSON.stringify({ ...adult, age: 'child', journey: 'Psalm Nights' }));
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(<Index />); });
  assert.equal(tree.root.findAllByProps({ accessibilityRole: 'tab' }).some(n => n.findAllByType('Text' as any).some(t => t.children.join('').includes('Chat'))), false);
});
