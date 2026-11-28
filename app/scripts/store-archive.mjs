// What a store build really gets. `eas build --local` does not build the git checkout: it copies the repo with
// eas-cli's own ignore rules (eas-cli 27.11.0 build/vcs/local.js `Ignore` + `makeShallowCopyAsync`, the EAS_CLI pinned
// in both store workflows), and those rules differ from git's. eas-cli's own note: "if parent .gitignore has ignore
// rule and child has exception to that rule, file will still be ignored". That is how night-bed.mp3 was in git and
// still missing from the 1.0.1 store builds (27 Nov 2026: EAGER_BUNDLE "Unable to resolve module").
// This file holds the same rules, on the same `ignore` package version eas-cli 27.11.0 pins (5.3.0), so a test can
// say which required file the store build would not get. Change it only with the EAS_CLI pin (the test checks both).
import ignore from 'ignore';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

export const EAS_CLI_RULES_FOR = 'eas-cli@27.11.0';

// Every .gitignore under root, as eas-cli finds them (its glob skips node_modules; .git holds none).
function gitignoreFiles(root, dir = '') {
  const out = [];
  for (const entry of readdirSync(join(root, dir), { withFileTypes: true })) {
    const rel = dir ? `${dir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      out.push(...gitignoreFiles(root, rel));
    } else if (entry.name === '.gitignore') out.push(rel);
  }
  return out;
}

// Returns (path relative to root) => true when eas-cli's copy leaves that path out of the store build.
export function easCopyDrops(root) {
  const mapping = [['', ignore().add('.git\nnode_modules\n')]];
  const easignore = join(root, '.easignore');
  if (existsSync(easignore)) mapping.push(['', ignore().add(readFileSync(easignore, 'utf8'))]);
  else
    for (const file of gitignoreFiles(root))
      mapping.push([file.slice(0, file.length - '.gitignore'.length), ignore().add(readFileSync(join(root, file), 'utf8'))]);
  // `ignore` treats a path under an ignored folder as ignored, as fs.cp's filter does by never entering the folder.
  return (rel) => mapping.some(([prefix, ig]) => rel.startsWith(prefix) && ig.ignores(rel.slice(prefix.length)));
}

const ASSET = /\.(mp3|m4a|wav|aac|png|jpe?g|gif|webp|svg|ttf|otf|db|sqlite|mp4|json)$/;
const SOURCE = /\.(ts|tsx|js|jsx|mjs)$/;
const REF = /(?:require\(\s*|from\s+|import\s+)['"](\.{1,2}\/[^'"]+)['"]/g;

function sourceFiles(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') out.push(...sourceFiles(path));
    } else if (SOURCE.test(entry.name)) out.push(path);
  }
  return out;
}

// Every non-code file the app bundle pulls in by a relative require/import (app/src, app/app, app/modules), plus
// every ./assets file app.config.ts names (icon, adaptive icon, splash). Paths are relative to the repo root.
export function requiredAssets(appDir) {
  const root = resolve(appDir, '..');
  const found = new Set();
  for (const file of ['src', 'app', 'modules'].flatMap((d) => sourceFiles(join(appDir, d)))) {
    for (const [, spec] of readFileSync(file, 'utf8').matchAll(REF))
      if (ASSET.test(spec)) found.add(relative(root, resolve(dirname(file), spec)).split(sep).join('/'));
  }
  for (const [, spec] of readFileSync(join(appDir, 'app.config.ts'), 'utf8').matchAll(/['"](\.\/assets\/[^'"]+)['"]/g))
    found.add(relative(root, resolve(appDir, spec)).split(sep).join('/'));
  return [...found].sort();
}

// Files `npm run library` writes during the store build itself (eas-build-post-install), after the copy.
export const BUILT_IN_THE_BUILD = ['app/src/content/library.json', 'app/src/player/library.json'];

export const isFile = (root, rel) => existsSync(join(root, rel)) && statSync(join(root, rel)).isFile();
