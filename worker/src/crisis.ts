// Crisis detection, two layers (COMMON.md rule 3; QUALITY C03):
//  (a) a deterministic floor over normalised text that never misses the plain phrases, in
//      English and Spanish, with or without apostrophes, in leetspeak, and spread over turns;
//  (b) a meaning read by Cloudflare's safety model (Llama Guard) over the last 6 turns.
// Unambiguous phrases always get the fixed reply. Words that are also Bible-study words
// (abuse, rape, cutting, hits, die) fire only when the safety model agrees, or when it is
// down, so the floor fails toward safety. The safety read writes nothing and keeps nothing.
export type CrisisKind = 'selfharm' | 'abuse';
export type Turn = { role: 'user' | 'assistant'; text: string };
export type GuardVerdict = { verdict: 'safe' } | { verdict: 'unsafe'; kind: CrisisKind | null } | { verdict: 'down' };
export type CrisisResult = { fired: false; guard: GuardVerdict['verdict'] | 'skipped' } | { fired: true; kind: CrisisKind; layer: 'floor' | 'model' | 'floor+model-down' };

export function normalise(text: string): string {
  return ` ${text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[‘’'`´]/g, '')
    .replace(/1/g, 'i').replace(/3/g, 'e').replace(/0/g, 'o').replace(/4/g, 'a').replace(/@/g, 'a').replace(/\$/g, 's')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').replace(/\s+/g, ' ').trim()} `;
}

const W = String.raw;
const people = W`(?:he|she|they|dad|daddy|stepdad|step dad|father|stepfather|mom|mama|mother|stepmom|uncle|aunt|brother|sister|cousin|grandpa|grandfather|boyfriend|girlfriend|husband|wife|ex|partner|coach|teacher|pastor|youth pastor|priest|deacon|neighbor|babysitter|someone|somebody|a man|a guy|mi papa|mi padrastro|mi mama|mi madrastra|mi tio|mi hermano|mi primo|mi abuelo|mi novio|mi esposo|mi marido|mi pastor|el|ella)`;
const sure: Array<[CrisisKind, RegExp]> = [
  ['selfharm', new RegExp([
    W`kill(?:ing)? my ?self`, W`kms`, W`unalive`, W`suicid(?:e|al)`, W`end(?:ing)? (?:my|it) (?:own )?life`, W`end(?:ing)? it all`,
    W`take my (?:own )?life`, W`(?:i|im|i am|i really|i just) (?:\w+ )?(?:want|wanna|going|gonna|ready) (?:to )?die`, W`wish i (?:was|were|could be) dead`, W`better off (?:dead|without me)`,
    W`(?:dont|do not|dont really|no longer) want to (?:live|be alive|exist|wake up|be here anymore|be here no more|keep going|go on)`,
    W`(?:no|nothing to) (?:reason to )?live for`, W`no reason to live`,
    W`(?:hurt|hurting|harm|harming|cut|cutting|burn|burning) my ?self`, W`self harm`,
    W`(?:take|taking|swallow|swallowing) (?:all )?(?:of )?(?:my|the|these|those) (?:pills|meds|medication)`, W`overdose`, W`hang my ?self`, W`shoot my ?self`, W`slit my wrists?`,
    W`(?:jump|jumping) off (?:a|the) (?:bridge|building|roof)`,
    W`(?:me )?quiero (?:matarme|morir|morirme|suicidarme)`, W`me quiero (?:matar|morir|suicidar)`, W`matarme`, W`suicidarme`, W`suicidio`, W`quitarme la vida`,
    W`(?:ganas|deseos) de (?:morir|morirme|matarme)`, W`no quiero (?:vivir|seguir viviendo|despertar)`, W`ya no quiero vivir`,
    W`me (?:corto|cortare|corte)`, W`cortarme`, W`me hago dano`, W`hacerme dano`, W`me lastimo`, W`lastimarme`, W`(?:estarian|estarias|estaria) mejor sin mi`, W`mejor (?:muerto|muerta)`,
  ].join('|'))],
  ['abuse', new RegExp([
    W` ${people} (?:\w+ )?(?:hits|hit|beats|beat|chokes|choked|punches|punched|kicks|kicked|slaps|slapped|touches|touched|rapes|raped|molests|molested|abuses|abused|forces|forced) me`,
    W`(?:i was|i got|i am being|im being|been) (?:raped|molested|sexually abused|abused|assaulted|beaten)`, W`(?:molested|raped|sexually abused) me`, W`sexual(?:ly)? abus`,
    W` (?:me|nos) (?:pega|pegan|pego|golpea|golpean|golpeo|viola|violo|violaron|maltrata|maltrato)`, W` ${people} me (?:toca|tocan|toco|tocaba)`, W`abuso de mi`, W`abusaron de mi`, W`abuso sexual`,
  ].join('|'))],
];
// Words with an ordinary Bible-study meaning; a crisis only when the model agrees or is down.
const ambiguous: Array<[CrisisKind, RegExp]> = [
  ['abuse', /\b(?:abuse|abused|abusive|rape|raped|rapist|molest\w*|incest|hits|hitting|beats|beating|violacion|violada|abuso|abusan|pegar|golpes)\b/],
  ['selfharm', /\b(?:cutting|cut|die|dying|death wish|pills|kill|hopeless|worthless|morir|muerte|pastillas)\b|cant (?:go on|do this anymore|keep going|take it anymore)|ya no aguanto/],
];

export function floor(turns: Turn[]): { sure: CrisisKind | null; ambiguous: CrisisKind | null } {
  const users = turns.filter(t => t.role === 'user').slice(-6).map(t => normalise(t.text));
  // Each turn on its own, then each pair of neighbours joined, so "i want to" + "die" is one phrase.
  const texts = [...users, ...users.slice(1).map((t, i) => `${users[i].trimEnd()}${t}`)];
  for (const [kind, re] of sure) if (texts.some(t => re.test(t))) return { sure: kind, ambiguous: null };
  for (const [kind, re] of ambiguous) if (texts.some(t => re.test(t))) return { sure: null, ambiguous: kind };
  return { sure: null, ambiguous: null };
}

const guardKinds: Record<string, CrisisKind> = { S11: 'selfharm', S1: 'abuse', S3: 'abuse', S4: 'abuse' };

/** Llama Guard on Workers AI: the last 6 turns. Any error or odd output is 'down', never 'safe'. */
export async function guardRead(ai: Ai, model: string, turns: Turn[]): Promise<GuardVerdict> {
  try {
    const messages = turns.slice(-6).map(t => ({ role: t.role, content: t.text.slice(0, 2000) }));
    const out = (await ai.run(model as keyof AiModels, { messages } as never)) as { response?: unknown };
    const r = out?.response;
    let safe: boolean | undefined; let categories: string[] = [];
    if (r && typeof r === 'object' && 'safe' in r) { safe = Boolean((r as { safe: unknown }).safe); categories = ((r as { categories?: string[] }).categories ?? []).map(String); }
    else if (typeof r === 'string') { const lines = r.trim().split(/\s+/); safe = lines[0] === 'safe' ? true : lines[0] === 'unsafe' ? false : undefined; categories = lines.slice(1).join(',').split(',').filter(Boolean); }
    if (safe === undefined) return { verdict: 'down' };
    if (safe) return { verdict: 'safe' };
    const kinds = categories.map(c => guardKinds[c.trim().toUpperCase()]).filter(Boolean);
    return { verdict: 'unsafe', kind: kinds.includes('selfharm') ? 'selfharm' : kinds[0] ?? null };
  } catch {
    return { verdict: 'down' };
  }
}

export async function detectCrisis(turns: Turn[], guard: () => Promise<GuardVerdict>): Promise<CrisisResult> {
  const f = floor(turns);
  if (f.sure) return { fired: true, kind: f.sure, layer: 'floor' };
  const g = await guard();
  if (g.verdict === 'unsafe' && g.kind) return { fired: true, kind: g.kind, layer: 'model' };
  if (f.ambiguous && g.verdict === 'unsafe') return { fired: true, kind: f.ambiguous, layer: 'model' };
  if (f.ambiguous && g.verdict === 'down') return { fired: true, kind: f.ambiguous, layer: 'floor+model-down' };
  return { fired: false, guard: g.verdict };
}
