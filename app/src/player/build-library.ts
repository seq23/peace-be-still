// Builds app/src/player/library.json from the repo's audio/manifest.jsonl (npm run library: before start, typecheck,
// the web export and EAS builds, never on install, so each bundles the current passed rows). Story titles come from the story JSON.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readManifest, type ManifestRow, type Titles } from './library';

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const MANIFEST = join(REPO, 'audio/manifest.jsonl');
// Every folder whose scripts are spoken: stories and the two sleep-session kinds (Psalm Nights, Imagination Nights).
const SCRIPT_ROOTS = ['stories', 'psalm-nights', 'imagination-nights'].map(folder => join(REPO, 'content', folder) + sep);

/** A content row's ref is its script's path in the repo (the fill may add `#<id>`); its title is the script's own title. */
export function storyTitle(row: ManifestRow): Titles | null {
  const path = resolve(REPO, row.ref.split('#')[0]);
  if (!SCRIPT_ROOTS.some(root => path.startsWith(root)) || !path.endsWith('.json') || !existsSync(path)) return null;
  try {
    const title = JSON.parse(readFileSync(path, 'utf8')).title;
    return typeof title === 'string' && title.trim() ? { [row.lang]: title.trim() } : null;
  } catch { return null; }
}

export function buildLibrary(jsonl = readFileSync(MANIFEST, 'utf8')) {
  return readManifest(jsonl, storyTitle);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { tracks, skipped } = buildLibrary();
  writeFileSync(join(dirname(fileURLToPath(import.meta.url)), 'library.json'), JSON.stringify(tracks) + '\n');
  for (const s of skipped) console.log(`HELD manifest line ${s.line}: ${s.reason}`);
  console.log(`OUTPUT ${tracks.length} tracks in the app library, ${skipped.length} held`);
}
