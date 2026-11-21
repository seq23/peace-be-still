// Variety across answers (hostile review round 4: "the quiet hours of the night make every shadow
// stretch tall" in one answer and "the quiet hours have a way of making every shadow look taller"
// in another). One answer can be fine and still read as a template to someone who chats every night.
// The model writes every answer whole (hostile review of 25c474f, F1/F2: code that chose the first
// word of the prayer, injected a picture and cut sentences out produced "Teach God to guide her" and
// "Mercy is a deep well" to the grieving). Variety comes from the prompt and from human-written voice
// samples rotated in as examples (src/voice/samples.ts, nextSeq below), never from code splicing words.
// This file is only the after-check: each draft is compared with the last answers she was given
// (her install) and the last answers anyone was given:
//  - the same opening shape (first three words, stemmed),
//  - the same closing shape (first three words of the last sentence, a verse reference as REF),
//  - the same image (two or more shared pairs of content words, stemmed).
// A match is a rewrite told what repeated, in the draft's own words. Nothing readable is kept: each
// opener, closer and pair is stored only as a keyed hash (HMAC with IP_HASH_SECRET, 8 hex).
// Self-contained (no app imports) so the red-team runner can load it under plain node.
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export type Shape = { opener: string; closer: string; pairs: string[] };
/** The draft's own words for each part (never stored): what the rewrite is told to avoid. */
/** The draft's own words, kept only in the request: its sentences, and which sentence each pair came from. */
export type Said = { opener: string; closer: string; pairs: string[]; sentences: string[]; where: number[] };
export const RECENT_MINE = 12;
export const RECENT_ALL = 40;
export const SHAPE_DAYS = 14;

// Words that carry no image: function words (EN, ES) and the names of God every answer may use.
// No other exemption (F6): a required line said the same way every time is repetition too.
const STOP = new Set(`a an the and or but so if of to in on at by for with from into onto over under about as than then that this these those there here it its is are was were be been being am do does did have has had will would can could should shall may might must not no nor never very just even also only still yet too more most much many any some all every each one own same such what when where who whom whose why how which while because though although until up down out off again once your you yours yourself i me my mine we us our ours he him his she her hers they them their theirs itself way ways thing things lot let lets get gets got make makes made making take takes like
el la los las un una unos unas y o pero si de del a al en con por para sin sobre como que se su sus tu tus te ti mi mis me nos lo le les es son era fue ser estar esta estas este estos esa ese eso hay muy mas tambien ya aun cuando donde quien porque pues ni no hace hacer cada todo toda todos todas
god gods lord jesus christ dios senor jesucristo
`.split(/\s+/));
const REF = /(?:[123]\s+)?(?:\p{L}+\s+){0,2}\p{L}+\.?\s+\d{1,3}\s*:\s*\d{1,3}(?:\s*[-–]\s*\d{1,3})?/gu;
const stem = (w: string) => w.slice(0, 4);
const sentencesOf = (text: string) => text.replace(REF, ' REF ').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
const wordsOf = (s: string) => fold(s).split(' ').filter(Boolean);

/** The sentences as written, references put back in order (the shape reads them as REF). */
function withRefs(text: string, sentences: string[]): string[] {
  const refs = text.match(REF) ?? [];
  let k = 0;
  return sentences.map(x => x.replace(/ ?REF ?/g, m => `${m.startsWith(' ') ? ' ' : ''}${refs[k++] ?? ''}${m.endsWith(' ') ? ' ' : ''}`).replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')').trim());
}
export function shapeOf(text: string): Shape & { said: Said } {
  const sentences = sentencesOf(text);
  const head = (s: string | undefined) => (s ? wordsOf(s).slice(0, 3).map(stem).join(' ') : '');
  const said = (s: string | undefined) => (s ? s.replace(/\bREF\b/g, '(verse)').split(/\s+/).filter(Boolean).slice(0, 3).join(' ') : '');
  const pairs = new Map<string, string>();
  const where: number[] = [];
  for (const [n, s] of sentences.entries()) {
    const content = wordsOf(s).filter(w => w !== 'ref' && w.length > 2 && !STOP.has(w));
    // Pairs one and two words apart: "every shadow stretch tall" and "every shadow look taller" share two.
    for (let i = 0; i < content.length; i++) for (const j of [i + 1, i + 2]) {
      if (j >= content.length || stem(content[i]) === stem(content[j])) continue;
      const key = `${stem(content[i])} ${stem(content[j])}`;
      if (!pairs.has(key)) { pairs.set(key, `${content[i]} ${content[j]}`); where.push(n); }
    }
  }
  // A last "sentence" that is only a reference is not a shape.
  const closing = sentences.length > 1 && head(sentences.at(-1)).split(' ').length >= 2;
  return {
    opener: head(sentences[0]), closer: closing ? head(sentences.at(-1)) : '', pairs: [...pairs.keys()],
    said: { opener: said(sentences[0]), closer: closing ? said(sentences.at(-1)) : '', pairs: [...pairs.values()], sentences: withRefs(text, sentences), where },
  };
}

/** Problems for a draft against earlier answers (plain or hashed shapes, compared like for like). */
export function repeats(draft: Shape, recent: Shape[]): string[] {
  const problems = new Set<string>();
  for (const r of recent) {
    if (draft.opener && draft.opener === r.opener) problems.add('repeat_opening');
    if (draft.closer && draft.closer === r.closer) problems.add('repeat_closing');
    const theirs = new Set(r.pairs);
    if (draft.pairs.filter(p => theirs.has(p)).length >= 2) problems.add('repeat_image');
  }
  return [...problems];
}

/**
 * The rewrite is an edit, not a fresh answer (r8, run 44899789903: 21 of 63 shown answers still
 * repeated after two fresh tries, because each fresh draft met new recent answers). The model gets its
 * own draft back with the sentences that repeat named; every other sentence has already been checked
 * against the whole window, so keeping them can only lower the repeats.
 */
export function varietyObjection(draft: Shape, said: Said, recent: Shape[]): string {
  const redo = new Set<number>();
  const words: string[] = [];
  const last = said.sentences.length - 1;
  if (draft.opener && recent.some(r => r.opener === draft.opener)) redo.add(0);
  if (draft.closer && recent.some(r => r.closer === draft.closer)) redo.add(last);
  for (const r of recent) {
    const theirs = new Set(r.pairs);
    const hit = draft.pairs.map((p, i) => (theirs.has(p) ? i : -1)).filter(i => i >= 0);
    if (hit.length >= 2) for (const i of hit) { redo.add(said.where[i]); words.push(said.pairs[i]); }
  }
  if (!redo.size) return '';
  const lines = said.sentences.map((x, n) => `${redo.has(n) ? '[REWRITE] ' : ''}${x}`).join('\n');
  const openClose = [redo.has(0) && draft.opener && recent.some(r => r.opener === draft.opener) ? `the first sentence must begin another way than "${said.opener}"` : '', redo.has(last) && draft.closer && recent.some(r => r.closer === draft.closer) ? `the last sentence must begin another way than "${said.closer}"` : ''].filter(Boolean);
  return `Its sentences marked [REWRITE] say things the way recent answers to other people did${words.length ? ` (${[...new Set(words)].slice(0, 8).map(w => `"${w}"`).join(', ')})` : ''}${openClose.length ? `, and ${openClose.join(' and ')}` : ''}. Write three versions of the answer. In each, keep every unmarked sentence word for word and rewrite only the marked ones, each version differently, in fresh, concrete words for this person (a different picture, or none), keeping the same verses. Reply with JSON {\"versions\": [{\"text\": string, \"references\": [...]}, ...]}:\n${lines}`;
}

const encoder = new TextEncoder();
/** The same shape with every part replaced by a keyed 8-hex hash: comparable, not readable. */
export async function hashShape(shape: Shape, secret: string): Promise<Shape> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(`variety|${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const h = async (s: string) => s ? [...new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(s))).slice(0, 4)].map(b => b.toString(16).padStart(2, '0')).join('') : '';
  return { opener: await h(shape.opener), closer: await h(shape.closer), pairs: await Promise.all(shape.pairs.map(h)) };
}

type Row = { opener: string; closer: string; pairs: string };
/** Her last answers and everyone's last answers, as hashed shapes. */
export async function recentShapes(db: D1Database, installId: string): Promise<Shape[]> {
  const read = async (scope: string, n: number) => (await db.prepare('SELECT opener, closer, pairs FROM answer_shape WHERE scope = ? ORDER BY at DESC LIMIT ?').bind(scope, n).all<Row>()).results;
  const rows = [...await read(installId, RECENT_MINE), ...await read('all', RECENT_ALL)];
  return rows.map(r => ({ opener: r.opener, closer: r.closer, pairs: r.pairs ? r.pairs.split(' ') : [] }));
}

export async function saveShape(db: D1Database, installId: string, hashed: Shape, now: number): Promise<void> {
  const insert = (scope: string) => db.prepare('INSERT INTO answer_shape (scope, at, opener, closer, pairs) VALUES (?, ?, ?, ?, ?)').bind(scope, now, hashed.opener, hashed.closer, hashed.pairs.join(' '));
  const prune = (scope: string, keep: number) => db.prepare('DELETE FROM answer_shape WHERE scope = ? AND at < (SELECT min(at) FROM (SELECT at FROM answer_shape WHERE scope = ? ORDER BY at DESC LIMIT ?))').bind(scope, scope, keep);
  await db.batch([insert(installId), insert('all'), prune(installId, RECENT_MINE), prune('all', RECENT_ALL)]);
}

export type Lane = 'en' | 'es' | 'mindset';
/** The next number in one plain counter per lane (no identifier, never reset): picks which voice samples go in. */
export async function nextSeq(db: D1Database, lane: Lane): Promise<number> {
  const row = await db.prepare("INSERT INTO chat_counts (day, metric, n) VALUES ('seq', ?, 1) ON CONFLICT(day, metric) DO UPDATE SET n = n + 1 RETURNING n").bind(`plan:${lane}`).first<{ n: number }>();
  return row?.n ?? Math.floor(Math.random() * 1e6);
}
