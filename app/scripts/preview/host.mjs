import { spawnSync } from 'node:child_process';
import { writeFileSync, existsSync, renameSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { noindex, publishPages } from '../../../scripts/lib/pages-publish.mjs';
import { resolve, join } from 'node:path';

// Cloudflare Pages never uploads a folder named node_modules, and Expo's web export puts every
// bundled font and picture under assets/node_modules/. On 10 Nov 2026 that left the preview a
// blank page: the fonts answered with the home page, so the app never drew. Move the folder to
// assets/nm and point the bundles at it. Returns how many files were rewritten.
export function moveBundledAssets(directory) {
  const from = resolve(directory, 'assets', 'node_modules');
  if (!existsSync(from)) return 0;
  renameSync(from, resolve(directory, 'assets', 'nm'));
  let changed = 0;
  const walk = (dir) => { for (const name of readdirSync(dir)) { const path = join(dir, name); if (statSync(path).isDirectory()) walk(path); else if (/\.(js|html|json|map)$/.test(name)) { const text = readFileSync(path, 'utf8'); if (text.includes('/assets/node_modules/')) { writeFileSync(path, text.replaceAll('/assets/node_modules/', '/assets/nm/')); changed++; } } } };
  walk(resolve(directory));
  return changed;
}

// The four faces the app loads (app/_layout.tsx). Preloading them from index.html lets the phone fetch them
// alongside the JS bundle instead of after it, so a slow phone draws the first screen sooner. Returns the count.
export const FONTS = ['Figtree_400Regular', 'Figtree_600SemiBold', 'LibreCaslonText_400Regular', 'SplineSansMono_500Medium'];
export function preloadFonts(directory) {
  const found = [];
  const walk = (dir) => { for (const name of readdirSync(dir)) { const path = join(dir, name); if (statSync(path).isDirectory()) walk(path); else if (/\.ttf$/.test(name) && FONTS.some(font => name.startsWith(font + '.'))) found.push(path.slice(resolve(directory).length).split('\\').join('/')); } };
  walk(resolve(directory, 'assets'));
  const index = resolve(directory, 'index.html');
  const html = readFileSync(index, 'utf8');
  const links = found.filter(href => !html.includes(`href="${href}"`)).map(href => `<link rel="preload" href="${href}" as="font" type="font/ttf" crossorigin>`).join('');
  writeFileSync(index, html.replace('</head>', `${links}</head>`));
  return found.length;
}

// App-only preparation, then the repo's one Pages publisher (scripts/lib/pages-publish.mjs).
export function publish({ project, branch, directory = 'dist', env = process.env, run = spawnSync }) {
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID || !branch || !existsSync(resolve(directory, 'index.html'))) throw new Error('NAMED STOP [PREVIEW_HOST_FAILED]');
  moveBundledAssets(directory);
  if (preloadFonts(directory) < FONTS.length) throw new Error('NAMED STOP [PREVIEW_HOST_FAILED]');
  // The two cross-origin headers let SQLite (the Bible) run in the browser.
  noindex(directory, '  Cross-Origin-Embedder-Policy: require-corp\n  Cross-Origin-Opener-Policy: same-origin\n  Cross-Origin-Resource-Policy: same-origin\n');
  const url = publishPages({ project, branch, directory, env, run });
  if (env.GITHUB_STEP_SUMMARY) writeFileSync(env.GITHUB_STEP_SUMMARY, `[Open the phone app preview](${url})\n\nFree web preview. No Appetize minutes.\n`);
  return url;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  try { console.log(publish({ project: process.argv[2], branch: process.env.PREVIEW_BRANCH })); }
  catch { console.error('NAMED STOP [PREVIEW_HOST_FAILED]'); process.exitCode = 1; }
}
