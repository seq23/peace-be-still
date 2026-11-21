import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import banned from '../src/quality/banned.json';

// Scan literal UI copy and icon names, not the test fixtures or validation patterns.
test('app copy and icon names avoid prohibited marks and automatic design tells', () => {
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : /\.(tsx?|json)$/.test(entry.name) ? [join(dir, entry.name)] : []);
  const files = [...walk('app'), ...walk('src')].filter(file => file !== 'src/quality/banned.json');
  const prohibited = new RegExp(`\\b(?:${banned.ui.join('|')})\\b|black[\\W_]*bible[\\W_]*stories|\\p{Extended_Pictographic}|[—!]`, 'iu');
  let examined = 0;
  for (const file of files) {
    if (file.endsWith('.json')) {
      const visitValue = (value: unknown): void => {
        if (typeof value === 'string') { examined++; if (value !== 'Choose your journey') assert.doesNotMatch(value, prohibited, `${file}: ${value}`); }
        else if (value && typeof value === 'object') Object.values(value).forEach(visitValue);
      };
      visitValue(JSON.parse(readFileSync(file, 'utf8')));
      continue;
    }
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    function visit(node: ts.Node) {
      if (file === 'src/model.ts' && ts.isFunctionDeclaration(node)) return;
      if (ts.isStringLiteral(node) || ts.isJsxText(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        examined++;
        if (node.text !== 'Choose your journey') assert.doesNotMatch(node.text, prohibited, `${file}: ${node.text}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.ok(examined > 0);
});


test('every English translation key has a Spanish translation', () => {
  type Entry = string | Record<string, string>;
  const en = JSON.parse(readFileSync('src/i18n/en.json', 'utf8')) as Record<string, Entry>;
  const es = JSON.parse(readFileSync('src/i18n/es.json', 'utf8')) as Record<string, Entry>;
  // A plural entry is { one, other }: both languages need both forms.
  const forms = (entry: Entry | undefined) => typeof entry === 'string' ? [entry] : entry && typeof entry === 'object' ? [entry.one, entry.other] : [undefined];
  assert.ok(Object.keys(en).length > 0);
  for (const key of Object.keys(en)) {
    assert.equal(typeof es[key], typeof en[key], `Spanish entry has a different shape: ${key}`);
    for (const value of [...forms(en[key]), ...forms(es[key])]) assert.ok(typeof value === 'string' && value.trim(), `Missing translation: ${key}`);
  }
});

// Apple rejects unfinished apps (PHASES.md, APPLE REJECTION CHECKS): every tab reaches a real screen.
test('no "Coming soon" page or string ships, in English or Spanish', () => {
  const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : /\.(tsx?|json)$/.test(entry.name) ? [join(dir, entry.name)] : []);
  const files = [...walk('app'), ...walk('src')];
  assert.ok(files.length > 10);
  for (const file of files) assert.doesNotMatch(readFileSync(file, 'utf8'), /coming soon|pr[oó]ximamente/i, file);
});
