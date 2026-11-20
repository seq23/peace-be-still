import React from 'react';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { create, act, ReactTestRenderer } from 'react-test-renderer';
import { faithContentIssues } from '../src/model';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
let saved: string | null = null;
(globalThis as any).__pbsStorage = { getItem: async () => saved, setItem: async (_key: string, value: string) => { saved = value; } };
// Storage is installed before the app module is loaded.
const Index = require('../app/index').default;
const strings = (tree: ReactTestRenderer) => tree.root.findAllByType('Text' as any).map(n => n.children.filter(x => typeof x === 'string').join('')).join(' ');
async function mount(value: object | null = null) { saved = value ? JSON.stringify(value) : null; let tree!: ReactTestRenderer; await act(async () => { tree = create(<Index />); }); return tree; }
async function press(tree: ReactTestRenderer, text: string) { const button = tree.root.findAllByType('Pressable' as any).find(n => n.findAllByType('Text' as any).some(t => t.children.join('').includes(text))); assert.ok(button, `Missing button ${text}`); await act(async () => button.props.onPress()); }
async function enterYear(tree: ReactTestRenderer, year: string) { await act(async () => tree.root.findByType('TextInput' as any).props.onChangeText(year)); await press(tree, 'Continue  ›'); }
const base = { door: 'faith', age: 'adult', voice: 'plain', language: 'en' };
test('renders onboarding, saves the door, and resumes at the unfinished journey', async () => {
 const tree = await mount(); assert.match(strings(tree), /What do you need tonight/); await press(tree, "God's Word"); assert.match(strings(tree), /What year were you born/); await enterYear(tree, '1990'); assert.match(strings(tree), /Choose your journey/); assert.equal(JSON.parse(saved!).door, 'faith'); const resumed = await mount(JSON.parse(saved!)); assert.match(strings(resumed), /Choose your journey/); await press(resumed, 'Psalm Nights'); await press(resumed, 'Start Psalm Nights'); assert.match(strings(resumed), /Good to have you here/); const restored = await mount(JSON.parse(saved!)); assert.match(strings(restored), /Psalm Nights/);
});
test('renders age routes, restricted chat and teen voice', async () => {
 for (const [year, chat] of [['2020', false], ['2010', true], ['1990', true]] as const) { const tree = await mount(); await press(tree, "God's Word"); await enterYear(tree, year); await press(tree, 'Young Faith'); await press(tree, 'Start Young Faith'); assert.equal(strings(tree).includes('Talk about what is on your mind'), chat); if (year === '2010') { await press(tree, 'Settings'); assert.match(strings(tree), /Teen/); assert.doesNotMatch(strings(tree), /Plain modern/); } }
});
test('renders faith screens without prohibited content and mindset screens separately', async () => {
 const tree = await mount(base); const check = () => assert.deepEqual(faithContentIssues(strings(tree)), []); check(); await press(tree, 'Hush Harbor'); await press(tree, 'Start Hush Harbor'); check(); await press(tree, 'Today'); check(); await press(tree, 'Back home  ›'); await press(tree, 'Settings'); check(); await press(tree, 'Change your door'); await press(tree, 'Mindset'); assert.match(strings(tree), /Imagination Nights/); await press(tree, 'Living in the end'); await press(tree, 'Start Living in the end'); assert.match(strings(tree), /Take a moment for yourself/); await press(tree, 'Saved'); assert.match(strings(tree), /Coming soon/);
});

test('teen selection of the Spanish journey retains the teen voice', async () => {
 const tree = await mount({ ...base, age: 'teen', voice: 'teen' }); await press(tree, 'Mi Refugio'); await press(tree, 'Start Mi Refugio'); assert.equal(JSON.parse(saved!).voice, 'teen'); assert.equal(JSON.parse(saved!).language, 'en');
});

test('mindset scripture preference persists and can be changed in settings', async () => {
 const tree = await mount({ ...base, door: 'mindset' });
 const toggle = tree.root.findByProps({ accessibilityRole: 'switch' });
 await act(async () => toggle.props.onPress());
 assert.equal(JSON.parse(saved!).scripture, true);
 const restored = await mount(JSON.parse(saved!));
 assert.equal(restored.root.findByProps({ accessibilityRole: 'switch' }).props.accessibilityState.checked, true);
});

test('Mi Refugio uses Spanish at home without changing the saved app language', async () => {
 const tree = await mount(base);
 await press(tree, 'Mi Refugio'); await press(tree, 'Start Mi Refugio');
 assert.match(strings(tree), /TE DAMOS LA BIENVENIDA/);
 assert.equal(JSON.parse(saved!).language, 'en');
 await press(tree, 'Configuración');
 assert.match(strings(tree), /Settings/);
});

test('settings choices expose their selected state', async () => {
 const tree = await mount({ ...base, journey: 'Psalm Nights' });
 await press(tree, 'Settings');
 const selected = tree.root.findAllByType('Pressable' as any).filter(n => n.props.accessibilityRole === 'radio' && n.props.accessibilityState.checked);
 assert.equal(selected.length, 2);
});


test('children do not see chat-led choices or chat settings', async () => {
 const tree = await mount({ ...base, age: 'child' });
 assert.doesNotMatch(strings(tree), /Hush Harbor|Mi Refugio/);
 await press(tree, 'Psalm Nights'); await press(tree, 'Start Psalm Nights');
 await press(tree, 'Settings');
 assert.doesNotMatch(strings(tree), /Chat voice|Plain modern|Black church/);
});

test('birth-year correction cannot promote a child', async () => {
 const tree = await mount({ ...base, age: 'child', journey: 'Psalm Nights' });
 await press(tree, 'Settings'); await press(tree, 'Birth year');
 await enterYear(tree, '1990');
 assert.equal(JSON.parse(saved!).age, 'child');
 assert.doesNotMatch(strings(tree), /Chat voice/);
});


test('a settings read failure does not permit resetting the age restriction', async () => {
 const storage = (globalThis as any).__pbsStorage;
 const getItem = storage.getItem;
 storage.getItem = async () => { throw new Error('unavailable'); };
 try {
  const tree = await mount();
  assert.match(strings(tree), /saved settings could not be read/);
  assert.equal(tree.root.findAllByType('Pressable' as any).length, 0);
 } finally { storage.getItem = getItem; }
});
