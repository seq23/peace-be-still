import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Scan literal UI copy and icon names, not the test fixtures or validation patterns.
test('app copy and icon names avoid prohibited marks and automatic design tells', () => {
  const files = ['app/index.tsx', 'src/model.ts'];
  const prohibited = /\b(?:unlock|elevate|dive in|delve|seamless|empower|tailored|embark|ai-powered|your faith companion|speak life|urban|sparkles?)\b|black[\W_]*bible[\W_]*stories|\p{Extended_Pictographic}/iu;
  let examined = 0;
  for (const file of files) {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    function visit(node: ts.Node) {
      if (file === 'src/model.ts' && ts.isFunctionDeclaration(node)) return;
      if (ts.isStringLiteral(node) || ts.isJsxText(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        examined++;
        assert.doesNotMatch(node.text, prohibited, `${file}: ${node.text}`);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert.ok(examined > 0);
});
