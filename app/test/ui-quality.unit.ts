import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { uiCopyIssues, visibleStrings } from './support/ui-copy';

const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
  entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);

test('every string a person can see avoids AI filler, em dashes, "!", emoji and the trademark phrase', () => {
  const screens = [...walk('app'), ...walk('src')].filter(file => file.endsWith('.tsx'));
  const files = [...screens, 'src/i18n/en.json', 'src/i18n/es.json'];
  const seen = files.flatMap(file => visibleStrings(file, readFileSync(file, 'utf8')));
  assert.ok(seen.length > 150, `only ${seen.length} visible strings found`);
  assert.deepEqual(files.flatMap(file => uiCopyIssues(file, readFileSync(file, 'utf8'))), []);
});

test('screens hold no literal copy: every visible word comes from the string files', () => {
  const screens = [...walk('app'), ...walk('src')].filter(file => file.endsWith('.tsx'));
  // Only the brand's chevrons and arrows may be written inline.
  const literal = screens.flatMap(file => visibleStrings(file, readFileSync(file, 'utf8')).filter(text => /\p{L}/u.test(text)).map(text => `${file}: ${text}`));
  assert.deepEqual(literal, []);
});

test('the check reads copy, never code: a style value passes and the same word as visible text fails', () => {
  assert.deepEqual(uiCopyIssues('fixture.tsx', `const s = { justifyContent: 'space-around' }; export const A = () => <View style={s} />;`), []);
  assert.equal(uiCopyIssues('fixture.tsx', `export const A = () => <Text>Make space around you</Text>;`).length, 1);
  assert.equal(uiCopyIssues('fixture.tsx', `export const A = () => <TextInput placeholder="Unlock more" />;`).length, 1);
  assert.equal(uiCopyIssues('fixture.json', JSON.stringify({ 'x.y': 'Your journey awaits' })).length, 1);
  // The locked title is fine on its own, with no exemption in the check.
  assert.deepEqual(uiCopyIssues('fixture.json', JSON.stringify({ 'journeys.title': 'Choose your journey' })), []);
});

test('a "Soon" tag is refused anywhere a person can see it, in English and Spanish, as a whole word in any case (her catch 24 Nov 2026)', () => {
  for (const word of ['Soon', 'SOON', 'Coming soon', 'Pronto', 'Muy pronto', 'Próximamente', 'proximamente']) {
    assert.equal(uiCopyIssues('src/i18n/es.json', JSON.stringify({ 'more.saved': word })).length, 1, word);
    assert.equal(uiCopyIssues('app/(tabs)/more.tsx', `export const A = () => <Text>${word}</Text>;`).length, 1, word);
    assert.equal(uiCopyIssues('app/(tabs)/more.tsx', `export const A = () => <TextInput placeholder="${word}" />;`).length, 1, word);
  }
  // Whole words only: a longer word that starts the same is not the tag.
  assert.deepEqual(uiCopyIssues('fixture.json', JSON.stringify({ a: 'Soonest', b: 'Prontuario' })), []);
});

test('every English string has a Spanish one of the same shape', () => {
  type Entry = string | Record<string, string>;
  const en = JSON.parse(readFileSync('src/i18n/en.json', 'utf8')) as Record<string, Entry>;
  const es = JSON.parse(readFileSync('src/i18n/es.json', 'utf8')) as Record<string, Entry>;
  const forms = (entry: Entry | undefined) => typeof entry === 'string' ? [entry] : entry && typeof entry === 'object' ? [entry.one, entry.other] : [undefined];
  assert.ok(Object.keys(en).length > 0);
  assert.deepEqual(Object.keys(es).sort(), Object.keys(en).sort());
  for (const key of Object.keys(en)) {
    assert.equal(typeof es[key], typeof en[key], `Spanish entry has a different shape: ${key}`);
    for (const value of [...forms(en[key]), ...forms(es[key])]) assert.ok(typeof value === 'string' && value.trim(), `Missing translation: ${key}`);
  }
});

test('every string in the files is used by a screen or the model', () => {
  const code = [...walk('app'), ...walk('src')].filter(file => /\.tsx?$/.test(file)).map(file => readFileSync(file, 'utf8')).join('\n');
  const en = JSON.parse(readFileSync('src/i18n/en.json', 'utf8')) as Record<string, unknown>;
  // A key is used when it is written out, or built from a known prefix (`door.${id}.title`).
  const unused = Object.keys(en).filter(key => !code.includes(`'${key}'`) && !code.includes(`"${key}"`) &&
    !/^(door\.(faith|mindset)\.(title|detail)|doorName\.|greeting\.|tabs\.|voice\.|language\.)/.test(key));
  assert.deepEqual(unused, []);
});
