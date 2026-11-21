import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { MARK } from '../src/theme/tokens';

test('the in-app mark is drawn from the brand files', () => {
  for (const file of ['assets/brand/pbs-mark-light.svg', 'assets/brand/pbs-mark-dark.svg']) {
    const paths = [...readFileSync(file, 'utf8').matchAll(/<path d="([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(paths, [MARK.wave, MARK.line], file);
  }
});

test('a slow phone\'s first paint is the mark (light and dark), drawn from the brand files', () => {
  const html = readFileSync('public/index.html', 'utf8');
  const root = html.slice(html.indexOf('<div id="root">'), html.indexOf('</body>'));
  for (const tile of ['light', 'dark']) {
    const svg = root.match(new RegExp(`<svg class="mark ${tile}"[\\s\\S]*?</svg>`))?.[0] ?? '';
    assert.deepEqual([...svg.matchAll(/<path d="([^"]+)"/g)].map(m => m[1]), [MARK.wave, MARK.line], tile);
  }
});

test('the preview preloads the four fonts the app loads', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const host: string = '../scripts/preview/host.mjs';
  const { preloadFonts, FONTS } = await import(host);
  const dir = mkdtempSync(join(tmpdir(), 'pbs-fonts-'));
  mkdirSync(join(dir, 'assets', 'nm', 'f'), { recursive: true });
  for (const font of [...FONTS, 'Ionicons']) writeFileSync(join(dir, 'assets', 'nm', 'f', `${font}.abc123.ttf`), '');
  writeFileSync(join(dir, 'index.html'), '<html><head></head><body></body></html>');
  assert.equal(preloadFonts(dir), 4);
  const html = readFileSync(join(dir, 'index.html'), 'utf8');
  assert.equal((html.match(/rel="preload"[^>]*as="font"[^>]*crossorigin/g) ?? []).length, 4);
  assert.ok(html.includes('href="/assets/nm/f/Figtree_400Regular.abc123.ttf"'));
  assert.ok(!html.includes('Ionicons'));
});
