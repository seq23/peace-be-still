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
 const tree = await mount(); assert.match(strings(tree), /What do you need tonight/); await press(tree, "God's Word"); assert.match(strings(tree), /What year were you born/); await enterYear(tree, '1990'); assert.match(strings(tree), /Choose your journey/); assert.equal(JSON.parse(saved!).door, 'faith'); const resumed = await mount(JSON.parse(saved!)); assert.match(strings(resumed), /Choose your journey/); await press(resumed, 'Psalm Nights'); assert.match(strings(resumed), /A little space to be still/); const restored = await mount(JSON.parse(saved!)); assert.match(strings(restored), /Psalm Nights/);
});
test('renders age routes, restricted chat and teen voice', async () => {
 for (const [year, chat] of [['2020', false], ['2010', true], ['1990', true]] as const) { const tree = await mount(); await press(tree, "God's Word"); await enterYear(tree, year); await press(tree, 'Young Faith'); assert.equal(strings(tree).includes('A place to talk'), chat); if (year === '2010') { await press(tree, 'Settings'); assert.match(strings(tree), /Teen/); assert.doesNotMatch(strings(tree), /Plain modern/); } }
});
test('renders faith screens without prohibited content and mindset screens separately', async () => {
 const tree = await mount(base); const check = () => assert.deepEqual(faithContentIssues(strings(tree)), []); check(); await press(tree, 'Hush Harbor'); check(); await press(tree, 'Today'); check(); await press(tree, 'Back home  ›'); await press(tree, 'Settings'); check(); await press(tree, 'Change your door'); await press(tree, 'Mindset'); assert.match(strings(tree), /Imagination Nights/); await press(tree, 'Living in the end'); assert.match(strings(tree), /Make space for yourself/); await press(tree, 'Saved'); assert.match(strings(tree), /coming soon/);
});

test('teen selection of the Spanish journey retains the teen voice', async () => {
 const tree = await mount({ ...base, age: 'teen', voice: 'teen' }); await press(tree, 'Mi Refugio'); assert.equal(JSON.parse(saved!).voice, 'teen'); assert.equal(JSON.parse(saved!).language, 'en');
});

test('mindset scripture preference persists and can be changed in settings', async () => {
 const tree = await mount({ ...base, door: 'mindset' });
 const toggle = tree.root.findByProps({ accessibilityRole: 'switch' });
 await act(async () => toggle.props.onPress());
 assert.equal(JSON.parse(saved!).scripture, true);
 const restored = await mount(JSON.parse(saved!));
 assert.equal(restored.root.findByProps({ accessibilityRole: 'switch' }).props.accessibilityState.checked, true);
});
