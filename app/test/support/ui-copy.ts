// What a person can see, and only that: i18n string values, JSX text, and the accessibilityLabel / placeholder /
// title props a screen reader or an empty field shows. Style values, identifiers, imports and other string
// literals are code, so "space-around" is never judged as copy. Store copy (store/**, legal/**) is judged by
// lane 6A's release gate against the same banned.json.
import ts from 'typescript';
import banned from '../../src/quality/banned.json';

export const prohibited = new RegExp(`\\b(?:${banned.ui.join('|')})\\b|black[\\W_]*bible[\\W_]*stories|\\p{Extended_Pictographic}|[—!]`, 'iu');
const VISIBLE_PROPS = new Set(['accessibilityLabel', 'placeholder', 'title']);

/** Every visible string in one file. */
export function visibleStrings(file: string, source: string): string[] {
  if (file.endsWith('.json')) {
    const out: string[] = [];
    const visit = (value: unknown): void => {
      if (typeof value === 'string') out.push(value);
      else if (value && typeof value === 'object') Object.values(value).forEach(visit);
    };
    visit(JSON.parse(source));
    return out;
  }
  const out: string[] = [];
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node) && node.text.trim()) out.push(node.text.trim());
    if (ts.isJsxAttribute(node) && VISIBLE_PROPS.has(node.name.getText()) && node.initializer) {
      const init = node.initializer;
      if (ts.isStringLiteral(init)) out.push(init.text);
      else if (ts.isJsxExpression(init) && init.expression && ts.isStringLiteralLike(init.expression)) out.push(init.expression.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return out;
}

export function uiCopyIssues(file: string, source: string): string[] {
  return visibleStrings(file, source).filter(text => prohibited.test(text)).map(text => `${file}: ${text}`);
}
