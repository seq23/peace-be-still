// Variety across answers (hostile review round 4: "the quiet hours of the night make every shadow
// stretch tall" in one answer and "the quiet hours have a way of making every shadow look taller"
// in another; "<verse> reminds us" closed 14 of 56). One answer can be fine and still read as a
// template to someone who chats every night, so each draft is compared with the last answers
// she was given (her install) and the last answers anyone was given (the model's own habits):
//  - the same opening shape (first three words, stemmed),
//  - the same closing shape (first three words of the last sentence, a verse reference as REF),
//  - the same image (two or more shared pairs of content words, stemmed).
// A match is a rewrite, never a fallback: on the last try variety is waived (it is quality, not
// safety). Nothing readable is kept: each opener, closer and pair is stored only as a keyed hash
// (HMAC with IP_HASH_SECRET, 8 hex), never the words, and rows go after 14 days or with her memory.
// Self-contained (no app imports) so the red-team runner can load it under plain node.
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export type Shape = { opener: string; closer: string; pairs: string[] };
export const RECENT_MINE = 12;
export const RECENT_ALL = 40;
export const SHAPE_DAYS = 14;

// Words that carry no image: function words (EN, ES), the faith words every answer needs, and the
// words of the lines the rules REQUIRE (talk with a parent or school counselor; faith and treatment
// go together; talk it through with your pastor), which must be free to come back.
const STOP = new Set(`a an the and or but so if of to in on at by for with from into onto over under about as than then that this these those there here it its is are was were be been being am do does did have has had will would can could should shall may might must not no nor never very just even also only still yet too more most much many any some all every each one own same such what when where who whom whose why how which while because though although until up down out off again once your you yours yourself i me my mine we us our ours he him his she her hers they them their theirs itself way ways thing things lot let lets get gets got make makes made making take takes like
el la los las un una unos unas y o pero si de del a al en con por para sin sobre como que se su sus tu tus te ti mi mis me nos lo le les es son era fue ser estar esta estas este estos esa ese eso hay muy mas tambien ya aun cuando donde quien porque pues ni no hace hacer cada todo toda todos todas
god gods lord jesus christ spirit holy pray prayer praying pastor church bible scripture verse verses amen dios senor jesucristo espiritu santo orar oracion iglesia biblia escritura versiculo
talk talking through parent parents mom dad mother father school counselor trusted adult adults doctor doctors medicine medicines medication medications meds medical treatment therapy therapist together faith help listen
hablar habla hablalo mama papa padres consejero escuela adulto adultos confianza medico medicina medicinas medicamento medicamentos tratamiento juntos fe ayuda`.split(/\s+/));
const REF = /(?:[123]\s+)?(?:\p{L}+\s+){0,2}\p{L}+\.?\s+\d{1,3}\s*:\s*\d{1,3}(?:\s*[-–]\s*\d{1,3})?/gu;
const stem = (w: string) => w.slice(0, 4);
const sentencesOf = (text: string) => text.replace(REF, ' REF ').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
const wordsOf = (s: string) => fold(s).split(' ').filter(Boolean);

export function shapeOf(text: string): Shape {
  const sentences = sentencesOf(text);
  const head = (s: string | undefined) => (s ? wordsOf(s).slice(0, 3).map(stem).join(' ') : '');
  const pairs = new Set<string>();
  for (const s of sentences) {
    const content = wordsOf(s).filter(w => w !== 'ref' && w.length > 2 && !STOP.has(w)).map(stem);
    // Pairs one and two words apart: "every shadow stretch tall" and "every shadow look taller" share two.
    for (let i = 0; i < content.length; i++) for (const j of [i + 1, i + 2]) if (j < content.length && content[i] !== content[j]) pairs.add(`${content[i]} ${content[j]}`);
  }
  const closer = sentences.length > 1 ? head(sentences.at(-1)) : '';
  // A last "sentence" that is only a reference is not a shape.
  return { opener: head(sentences[0]), closer: closer.split(' ').length >= 2 ? closer : '', pairs: [...pairs] };
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
