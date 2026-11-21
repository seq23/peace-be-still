// Builds app/src/content/library.json (git-ignored, bundled) from the repo's checked content: the 200 stories in
// content/stories and the 365 Morning Word declarations in content/morning-word with their topics. Only items the
// content gate passed (status "passed", Claude's final verdict "pass") ship, and only the fields a screen reads:
// no qa records, no audio segments, and no verse text (scripture is read from the bundled Bible by reference). Runs with `npm run library` (before start, typecheck, the web export and EAS builds).
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Block, Declaration, Library, Story, Telling } from './types';

const HERE = dirname(fileURLToPath(import.meta.url));
export const CONTENT = resolve(HERE, '../../../content');
export const TELLINGS = ['plain', 'hush-harbor', 'mi-refugio'] as const satisfies readonly Telling[];

type Raw = Record<string, any>;
const passed = (item: Raw) => item.status === 'passed' && item.qa?.final?.verdict === 'pass';

/** A call-and-response block keeps its spoken text apart from the listener's lines and the silences between. */
function callParts(text: string) {
  const parts: Array<{ say: string } | { screen: string; seconds: number }> = [];
  const marker = /\[PAUSE (\d+)s \| screen: "([^"]+)"\]/g;
  let last = 0;
  for (const match of text.matchAll(marker)) {
    const say = text.slice(last, match.index).trim();
    if (say) parts.push({ say });
    parts.push({ screen: match[2], seconds: Number(match[1]) });
    last = match.index! + match[0].length;
  }
  const rest = text.slice(last).trim();
  if (rest) parts.push({ say: rest });
  return parts;
}

function block(raw: Raw): Block {
  if (raw.type === 'scripture') {
    // Only the reference ships: the screen reads the words from the bundled Bible, never a copy.
    return { type: 'scripture', ref: raw.ref, translation: raw.translation };
  }
  if (raw.type === 'call_response') return { type: 'call', parts: callParts(raw.text) };
  if (raw.type === 'retelling') return { type: 'retelling', text: raw.text };
  throw new Error(`Unknown story block type ${raw.type}`);
}

export function readStories(telling: Telling): { stories: Story[]; held: string[] } {
  const dir = join(CONTENT, 'stories', telling);
  const stories: Story[] = [];
  const held: string[] = [];
  for (const file of readdirSync(dir).filter(name => name.endsWith('.json')).sort()) {
    const raw = JSON.parse(readFileSync(join(dir, file), 'utf8')) as Raw;
    if (!passed(raw)) { held.push(raw.id ?? file); continue; }
    stories.push({
      id: raw.id, telling, lang: raw.lang, title: raw.title, refs: raw.passage.refs,
      violence: raw.content.violence, sexual: raw.content.sexual, blocks: raw.blocks.map(block),
    });
  }
  return { stories, held };
}

export function readDeclarations(lang: 'en' | 'es'): Declaration[] {
  const raw = JSON.parse(readFileSync(join(CONTENT, 'morning-word', `${lang}.json`), 'utf8')) as Raw;
  const topics = JSON.parse(readFileSync(join(CONTENT, 'morning-word', 'topics.json'), 'utf8')) as { items: Record<string, string> };
  return (raw.items as Raw[]).filter(passed).map(item => {
    const topic = topics.items[item.id];
    if (!topic) throw new Error(`DECLARATION_TOPIC_MISSING ${item.id}`);
    return { id: item.id, day: item.day, ref: item.ref, topic, text: item.declaration };
  });
}

export function buildContent(): { library: Library; held: string[] } {
  const held: string[] = [];
  const stories = Object.fromEntries(TELLINGS.map(telling => {
    const read = readStories(telling);
    held.push(...read.held);
    return [telling, read.stories];
  })) as Library['stories'];
  const topics = (JSON.parse(readFileSync(join(CONTENT, 'morning-word', 'topics.json'), 'utf8')) as { topics: string[] }).topics;
  return { library: { stories, declarations: { en: readDeclarations('en'), es: readDeclarations('es') }, topics }, held };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { library, held } = buildContent();
  const counts = TELLINGS.map(telling => `${library.stories[telling].length} ${telling}`);
  const empty = TELLINGS.filter(telling => !library.stories[telling].length);
  if (empty.length || !library.declarations.en.length || !library.declarations.es.length) {
    console.error(`CONTENT_LIBRARY_EMPTY: no passed ${empty.length ? `stories in ${empty.join(', ')}` : 'declarations'}`);
    process.exit(3);
  }
  writeFileSync(join(HERE, 'library.json'), JSON.stringify(library) + '\n');
  for (const id of held) console.log(`HELD ${id}: not passed by the content gate`);
  console.log(`OUTPUT content library: stories ${counts.join(', ')}; declarations ${library.declarations.en.length} en, ${library.declarations.es.length} es; ${held.length} held`);
}
