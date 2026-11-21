// Variety across answers (hostile review round 4: "the quiet hours of the night make every shadow
// stretch tall" in one answer and "the quiet hours have a way of making every shadow look taller"
// in another; "<verse> reminds us" closed 14 of 56). One answer can be fine and still read as a
// template to someone who chats every night.
// PRODUCED, not policed (round 5 rebuild): round 5 detected repeats after the draft and asked the
// model to rewrite, and 25 of 53 answers still repeated ("May you find..." closed 14), while the
// rewrites ate the tries real problems needed (7 fallbacks). So code now plans each answer BEFORE
// the model writes (planFor): the opening move, the middle move, the habit words to leave out and
// the first word of the last sentence, all from rotations driven by one counter with no identifier
// (planSeq). The closing words come from a list of more than RECENT_ALL distinct stems, so within the
// window no two answers are told to close the same way. The plan is code's own vocabulary: nothing
// she or the model wrote is read back to steer it.
// The after-check stays as the backstop: each draft is compared with the last answers she was given
// (her install) and the last answers anyone was given:
//  - the same opening shape (first three words, stemmed),
//  - the same closing shape (first three words of the last sentence, a verse reference as REF),
//  - the same image (two or more shared pairs of content words, stemmed).
// A match is a rewrite on a NEW plan; if every try repeats, the last draft that passed everything
// else is shown (index.ts), never the fallback. Nothing readable is kept: each opener, closer and
// pair is stored only as a keyed hash (HMAC with IP_HASH_SECRET, 8 hex), never the words.
// Self-contained (no app imports) so the red-team runner can load it under plain node.
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export type Shape = { opener: string; closer: string; pairs: string[] };
/** The draft's own words for each part (never stored): what the rewrite is told to avoid. */
export type Said = { opener: string; closer: string; pairs: string[] };
export const RECENT_MINE = 12;
export const RECENT_ALL = 40;
export const SHAPE_DAYS = 14;

// Words that carry no image: function words (EN, ES), the faith words every answer needs, and the
// words of the lines the rules REQUIRE (talk with a parent or school counselor; faith and treatment
// go together; talk it through with your pastor; since the 20 Nov doctrine ruling, sex belongs in
// marriage, and on a genuine split, faithful churches differ), which must be free to come back.
const STOP = new Set(`a an the and or but so if of to in on at by for with from into onto over under about as than then that this these those there here it its is are was were be been being am do does did have has had will would can could should shall may might must not no nor never very just even also only still yet too more most much many any some all every each one own same such what when where who whom whose why how which while because though although until up down out off again once your you yours yourself i me my mine we us our ours he him his she her hers they them their theirs itself way ways thing things lot let lets get gets got make makes made making take takes like
el la los las un una unos unas y o pero si de del a al en con por para sin sobre como que se su sus tu tus te ti mi mis me nos lo le les es son era fue ser estar esta estas este estos esa ese eso hay muy mas tambien ya aun cuando donde quien porque pues ni no hace hacer cada todo toda todos todas
god gods lord jesus christ spirit holy pray prayer praying pastor church bible scripture verse verses amen dios senor jesucristo espiritu santo orar oracion iglesia biblia escritura versiculo
sex sexual marriage married marry belongs husband wife wedding churches differ faithful
talk talking through parent parents mom dad mother father school counselor trusted adult adults doctor doctors medicine medicines medication medications meds medical treatment therapy therapist together faith help listen
sexo sexual matrimonio casados casarse casarnos esposo esposa pertenece iglesias difieren fieles
hablar habla hablalo mama papa padres consejero escuela adulto adultos confianza medico medicina medicinas medicamento medicamentos tratamiento juntos fe ayuda`.split(/\s+/));
const REF = /(?:[123]\s+)?(?:\p{L}+\s+){0,2}\p{L}+\.?\s+\d{1,3}\s*:\s*\d{1,3}(?:\s*[-–]\s*\d{1,3})?/gu;
const stem = (w: string) => w.slice(0, 4);
const sentencesOf = (text: string) => text.replace(REF, ' REF ').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
const wordsOf = (s: string) => fold(s).split(' ').filter(Boolean);

export function shapeOf(text: string): Shape & { said: Said } {
  const sentences = sentencesOf(text);
  const head = (s: string | undefined) => (s ? wordsOf(s).slice(0, 3).map(stem).join(' ') : '');
  const said = (s: string | undefined) => (s ? s.replace(/\bREF\b/g, '(verse)').split(/\s+/).filter(Boolean).slice(0, 3).join(' ') : '');
  const pairs = new Map<string, string>();
  for (const s of sentences) {
    const content = wordsOf(s).filter(w => w !== 'ref' && w.length > 2 && !STOP.has(w));
    // Pairs one and two words apart: "every shadow stretch tall" and "every shadow look taller" share two.
    for (let i = 0; i < content.length; i++) for (const j of [i + 1, i + 2]) {
      if (j >= content.length || stem(content[i]) === stem(content[j])) continue;
      const key = `${stem(content[i])} ${stem(content[j])}`;
      if (!pairs.has(key)) pairs.set(key, `${content[i]} ${content[j]}`);
    }
  }
  // A last "sentence" that is only a reference is not a shape.
  const closing = sentences.length > 1 && head(sentences.at(-1)).split(' ').length >= 2;
  return {
    opener: head(sentences[0]), closer: closing ? head(sentences.at(-1)) : '', pairs: [...pairs.keys()],
    said: { opener: said(sentences[0]), closer: closing ? said(sentences.at(-1)) : '', pairs: [...pairs.values()] },
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
 * The rewrite is told exactly what came back, in the draft's own words (the earlier answers are
 * only hashes): "It opened like a recent answer ("The quiet hours"); ... reused: quiet hours, hours shadow".
 */
export function varietyObjection(draft: Shape, said: Said, recent: Shape[]): string {
  const parts: string[] = [];
  if (draft.opener && recent.some(r => r.opener === draft.opener)) parts.push(`It opened like a recent answer ("${said.opener}..."); open another way, on what she said.`);
  if (draft.closer && recent.some(r => r.closer === draft.closer)) parts.push(`It closed like a recent answer ("${said.closer}..."); close another way.`);
  const shared = new Set<number>();
  for (const r of recent) {
    const theirs = new Set(r.pairs);
    const hit = draft.pairs.map((p, i) => (theirs.has(p) ? i : -1)).filter(i => i >= 0);
    if (hit.length >= 2) hit.forEach(i => shared.add(i));
  }
  if (shared.size) parts.push(`It reused wording from a recent answer (${[...shared].slice(0, 6).map(i => `"${said.pairs[i]}"`).join(', ')}); say those things in other words or leave them out; if they retell a verse, choose another verse or name it without retelling it.`);
  return parts.join(' ');
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

// ---- The plan (code chooses, before the model writes) ----
export type Lane = 'en' | 'es' | 'mindset';
export type Plan = { seq: number; text: string };

/** The next number in one plain counter per lane (no identifier, never reset): drives every rotation. */
export async function planSeq(db: D1Database, lane: Lane): Promise<number> {
  const row = await db.prepare("INSERT INTO chat_counts (day, metric, n) VALUES ('seq', ?, 1) ON CONFLICT(day, metric) DO UPDATE SET n = n + 1 RETURNING n").bind(`plan:${lane}`).first<{ n: number }>();
  return row?.n ?? Math.floor(Math.random() * 1e6);
}

// The last sentence's first word. Each list has more distinct stems than RECENT_ALL, so a counter
// that steps once per draft never tells two answers in the window to close the same way. P = a
// one-sentence prayer for her, V = one sentence of her own words about one of the verses.
const CLOSE_EN: Array<[kind: 'P' | 'V', word: string]> = ([
  'P Lord', 'P Carry', 'V Whatever', 'P Father', 'P Keep', 'P Gracious', 'V Even', 'P Meet', 'P Jesus', 'P Guard', 'V Since',
  'P Faithful', 'P Lead', 'P Steady', 'V Because', 'P God', 'P Quiet', 'P Surround', 'V Today', 'P Merciful', 'P Cover', 'P Strengthen',
  'V Wherever', 'P Holy', 'P Calm', 'P Settle', 'V Every', 'P Heavenly', 'P Draw', 'P Stay', 'V Before', 'P Shepherd', 'P Renew',
  'P Sustain', 'V Still', 'P Watch', 'P Comfort', 'P Grant', 'V Here', 'P Give', 'P Help', 'P Be', 'V This', 'P Walk', 'P Anchor', 'P Open', 'P Teach', 'P Hold', 'P Shelter',
] as const).map(s => s.split(' ') as ['P' | 'V', string]);
// Spanish speaks to her as tú to the very end (the voice rubric), so its closings are a blessing or
// a sentence about a verse, said to her: B = a short blessing, V = a sentence about one of the verses.
const CLOSE_ES: Array<[kind: 'B' | 'V', word: string]> = ([
  'B Que', 'V Hoy', 'V Aunque', 'B Descansa', 'V Mañana', 'V Cada', 'B Confía', 'V Nada', 'B Lleva', 'V Mientras', 'V Aún',
  'B Recuerda', 'B Pon', 'V Puedes', 'V Dios', 'B Sigue', 'V Ahora', 'V Todo', 'B Entrega', 'V Jesús', 'V Él', 'B Respira',
  'V Esta', 'V Tu', 'B Camina', 'V Tienes', 'B Guarda', 'V Mira', 'B Vuelve', 'V Lee', 'B Busca', 'V Cuando', 'B Deja', 'V Junto', 'B Abre', 'V Aquí', 'V Siempre', 'V Nunca', 'B Toma', 'B Escucha', 'B Habla', 'B Ora', 'V Gracias',
] as const).map(s => s.split(' ') as ['B' | 'V', string]);
const CLOSE_MINDSET = ['Breathe', 'Notice', 'Tomorrow', 'Let', 'Whatever', 'Rest', 'Picture', 'Even', 'One', 'Before', 'Small', 'Today', 'Keep', 'Give', 'Hold', 'Stay', 'Come', 'Leave', 'Carry', 'Name', 'When', 'Here', 'Each', 'Nothing', 'Quiet', 'Settle', 'Allow', 'Tonight', 'Listen', 'Start', 'Begin', 'Trust', 'Look', 'Return', 'Close', 'Slow', 'Write', 'Set', 'Take', 'Ease', 'Know'];
const OPEN_EN = [
  'Open on one concrete thing she told you, in your own words (never by restating her question).',
  'Open with one plain, true sentence about God that meets what she wrote.',
  'Open by answering her plainly in a short first sentence.',
  'Open with an honest, specific word about what is hard here, with no stock sympathy.',
].map(o => `${o} Its first word is not "The", "God", "Scripture" or "Faith".`); // "The Bible does", "God remains the", "Scripture teaches that": probes
const OPEN_ES = [
  'Empieza con algo concreto que ella te contó, con tus propias palabras (nunca repitiendo su pregunta).',
  'Empieza con una frase sencilla y verdadera sobre Dios que responda a lo que escribió.',
  'Empieza respondiéndole directamente, en una primera frase corta.',
  'Empieza con una palabra honesta y concreta sobre lo difícil de esto, sin frases hechas de consuelo.',
];
const MIDDLE_EN = [
  'In the middle, tell in a sentence or two how one person in the Bible met something like this.',
  'In the middle, give one concrete step she could take this week.',
  'In the middle, give the setting of one of your verses in a sentence: who said it, and when.',
  'In the middle, say one true thing about who God is that speaks to this.',
  'In the middle, stay with the details she gave, in plain words, without pictures or metaphors.',
];
const MIDDLE_ES = [
  'En el medio, cuenta en una o dos frases cómo una persona de la Biblia vivió algo parecido.',
  'En el medio, da un paso concreto que pueda dar esta semana.',
  'En el medio, da en una frase el contexto de uno de tus versículos: quién lo dijo y cuándo.',
  'En el medio, di algo verdadero sobre quién es Dios que hable a esto.',
  'En el medio, quédate con los detalles que ella dio, en palabras sencillas, sin imágenes ni metáforas.',
];
const MIDDLE_MINDSET = [
  'In the middle, give one small thing she can picture or do in the next few minutes.',
  'In the middle, stay with the details she gave, in plain words, without metaphors.',
  'In the middle, name one thing that is in her hands and one that is not.',
];
// The words the free models lean on in answer after answer (measured: the shared pairs of the
// round-4 and round-5 red teams). Each plan leaves out two of the three groups, a different two each time.
const REST_EN = [
  ['honor', 'bring', 'find', 'walk', 'path', 'journey', 'season', 'navigate'],
  ['peace', 'wisdom', 'strength', 'steady', 'guide', 'light', 'gentle', 'space'],
  ['please', 'consider', 'respect', 'others', 'life', 'care', 'heavy', 'ground'],
];
const REST_ES = [
  ['encontrar', 'camino', 'paso', 'guía'],
  ['paz', 'fuerza', 'carga', 'descanso'],
  ['recibir', 'acompañamiento', 'cercano', 'conversar', 'sugiero'],
];

/**
 * The plan for one answer, from the lane's counter: how it opens, what the middle does, the words it
 * leaves out, how it closes. A rewrite of the same answer keeps its number (so rewrites never use up
 * the closing words other answers need) and shifts the other moves by `attempt`. Its closing word
 * stays: no other answer in the window was given it, so a repeated closing means it was not followed.
 */
export function planFor(seq: number, lane: Lane, door: 'faith' | 'mindset' = 'faith', attempt = 0): Plan {
  const m = seq + attempt;
  const pick = <T>(list: readonly T[]) => list[m % list.length];
  const pickClose = <T>(list: readonly T[]) => list[seq % list.length];
  const rest = (groups: string[][]) => groups.filter((_, i) => i !== m % groups.length).flat().join(', ');
  if (lane === 'es') {
    const [kind, word] = pickClose(CLOSE_ES);
    const close = kind === 'B'
      ? `Termina con una bendición breve para ella, en una sola frase que le hable de tú y cuya primera palabra sea "${word}".`
      : `Termina con una sola frase completa, con tus propias palabras y dicha a ella de tú, sobre lo que uno de tus versículos significa para ella hoy, nombrándolo por su referencia; no repitas ni cites sus palabras y no escribas "dice" después de la referencia. Su primera palabra es "${word}".`;
    return { seq, text: `El plan de esta respuesta (síguelo; nunca lo menciones):\n- ${pick(OPEN_ES)}\n- ${door === 'mindset' ? MIDDLE_ES[[1, 4][m % 2]] : pick(MIDDLE_ES)}\n- Esta vez no uses estas palabras: ${rest(REST_ES)}.\n- Si estas reglas piden sugerir a su pastor o a un adulto de confianza, hazlo antes de la última frase, nunca en la primera.\n- ${close} Nada después de esa frase.` };
  }
  if (lane === 'mindset' || door === 'mindset') {
    return { seq, text: `The plan for this answer (follow it; never mention it):\n- ${OPEN_EN[[0, 2, 3][m % 3]]}\n- ${pick(MIDDLE_MINDSET)}\n- This time do not use these words: ${rest(REST_EN)}.\n- End on one calm sentence whose first word is "${pickClose(CLOSE_MINDSET)}". Nothing after that sentence.` };
  }
  const [kind, word] = pickClose(CLOSE_EN);
  const close = kind === 'P'
    ? `End with a short prayer for her in ONE sentence whose first word is "${word}".`
    : `End with ONE sentence, in your own words, on what one of your verses means for her today, naming it by its reference; do not retell or quote its words and do not write "says" or "reminds" after it. The sentence's first word is "${word}".`;
  return { seq, text: `The plan for this answer (follow it; never mention it):\n- ${pick(OPEN_EN)}\n- ${pick(MIDDLE_EN)}\n- This time do not use these words: ${rest(REST_EN)}.\n- If these rules ask you to suggest her pastor or a trusted adult, do it before the last sentence, never as the first one.\n- ${close} Nothing after that sentence.` };
}
/** For the tests: every closing word list has more distinct closing stems than the window. */
export const closeStems = (lane: Lane) => (lane === 'es' ? CLOSE_ES.map(c => c[1]) : lane === 'mindset' ? CLOSE_MINDSET : CLOSE_EN.map(c => c[1])).map(w => stem(fold(w)));
