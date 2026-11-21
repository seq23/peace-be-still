// Builds app/src/player/library.json from the repo's audio/manifest.jsonl (npm run library: before start, typecheck,
// the web export and EAS builds, never on install, so each bundles the current passed rows). Story titles come from the story JSON.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readManifest, type ManifestRow } from './library';

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
export const MANIFEST = join(REPO, 'audio/manifest.jsonl');
const SCRIPT_ROOTS = ['stories', 'imagination-nights'].map(folder => join(REPO, 'content', folder) + sep);

type Block = { type?: unknown; ref?: unknown };
const isScripture = (block: Block | undefined) => block?.type === 'scripture' && typeof block.ref === 'string';

/** A story's key verse: the Scripture its call and response answers (the last one before it), else its first. */
export function keyScripture(blocks: unknown): string | undefined {
  if (!Array.isArray(blocks)) return undefined;
  const call = blocks.findIndex((block: Block | undefined) => block?.type === 'call_response');
  for (let i = call - 1; i >= 0; i--) if (isScripture(blocks[i])) return blocks[i].ref;
  return blocks.find(isScripture)?.ref;
}

/** Content rows point to the source script that supplies its title and key Scripture reference. */
function scriptDisplay(row: ManifestRow) {
  const path = resolve(REPO, row.ref);
  if (!SCRIPT_ROOTS.some(root => path.startsWith(root)) || !path.endsWith('.json') || !existsSync(path)) return null;
  try {
    const { title, blocks } = JSON.parse(readFileSync(path, 'utf8'));
    if (typeof title !== 'string' || !title.trim()) return null;
    return { titles: { [row.lang]: title.trim() }, scriptureRef: keyScripture(blocks) };
  } catch { return null; }
}

export function buildLibrary(jsonl = readFileSync(MANIFEST, 'utf8')) {
  return readManifest(jsonl, scriptDisplay);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { tracks, skipped } = buildLibrary();
  writeFileSync(join(dirname(fileURLToPath(import.meta.url)), 'library.json'), JSON.stringify(tracks) + '\n');
  for (const s of skipped) console.log(`HELD manifest line ${s.line}: ${s.reason}`);
  console.log(`OUTPUT ${tracks.length} tracks in the app library, ${skipped.length} held`);
}
