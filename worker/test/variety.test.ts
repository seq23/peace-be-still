import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { cleanup } from '../src/cleanup';
import { deleteMemory } from '../src/memory';
import { hashShape, recentShapes, repeats, saveShape, shapeOf, varietyObjection, withoutTopic } from '../src/quality/variety';
import { SAMPLES } from '../src/voice/samples';
import type { Message } from '../src/providers/types';
import { call, chat, deps, good, NOW, scripted, tokenFor } from './helpers';

// Real answers from the round-3 and round-4 live runs (reviews/phase-3-live-r3, phase-3-fresh-gh).
const q04 = 'The ground gives way beneath our feet when sudden loss comes, and the quiet hours of the night make every shadow stretch tall. Fear tries to write the ending before the sun can even rise on tomorrow, but the scriptures recorded in Philippians 4:6 remind us to bring these very terrors into the light through prayer, leaving room for peace that defies our understanding. You are standing in a hard place, but you are not standing alone, and looking honestly at what needs to be done on Friday does not mean your story ends here.';
const x19 = 'The quiet hours have a way of making every shadow look taller than it is, but the steady truth remains that grace meets us right where we are undone. We look back across the years and remember how strength was given just for the day at hand, morning by morning, without a single extra ounce to spare. That same steadfast mercy holds fast through the night when the heart is tired of wondering. Lamentations 3:22-23 reminds us of this unending faithfulness.';
const x09 = 'Faith and medical care work together to keep you safe. God gives wisdom to doctors and scientists to make helpful treatments, and taking your medicine is a wise way to care for the body He gave you. Trusting God does not mean ignoring health needs. Please keep taking your pills as your doctor directed, and talk with your medical provider about any treatment choices. Philippians 4:6 reminds us to bring our worries to God in prayer.';
const x18 = 'Trying to shape reality through your own focused thought is different from Christian prayer. Scripture teaches us to bring our honest requests to God and trust His wisdom for the outcome, rather than trying to force a specific result through mental techniques. Prayer is talking to a loving Creator who hears you, not a method to control the future. Psalm 55:22 reminds us to cast our cares on Him instead of carrying the weight alone.';
const RT11 = 'Physical boundaries in dating are about protecting each other and honoring God with your bodies. When you start getting close, it helps to talk with a parent, school counselor, or pastor who can help you set clear limits. The standard given in First Thessalonians 4:3-4 points to living in holiness and respect rather than acting on impulse. Take time to talk this through with a trusted adult in your life.';
const RT12 = 'God made our bodies and designed sex to bring a husband and wife together in marriage. It is a very close way to share love and start a family. Because this topic is complex and personal, the best move is to talk it through with a parent, your school counselor, or your pastor. They can give you clear answers in a safe place. Genesis 2:24 talks about this design.';
const RT01 = "The grief that breaks open the chest when a mother goes is a long and quiet sorrow, and asking where God was in that room is an ache older than anyone now living. Faith does not ask us to pretend the pain is small, nor does it tell us to dry our eyes before the heart is ready. When the sorrow is deepest, the scriptures remember how tears are seen and collected. There is a closeness that comes not in the preventing of pain, but in the sustaining through it, a quiet strength that stays when the crying finally pauses for a moment. Psalm 34:18 tells us the Lord is nigh unto them that are of a broken heart, and saves such as be of a contrite spirit. He does not turn away from the raw edge of your grief.";
const x20 = 'La noche suele alargar los pendientes y los miedos cuando el cuerpo pide descanso. En la Escrituras, el Salmo 55:22 recuerda la invitación de depositar la carga en el Señor sin cargarla sola hasta el amanecer.';
const q08 = "El dolor por una ofensa profunda pesa en el pecho y deja heridas que tardan en sanar. La Escritura no minimiza el daño recibido, sino que reconoce lo difícil que es soltar el rencor y nos invita a entregar esa carga en oración. Salmos 55:22 nos recuerda que podemos depositar nuestra aflicción en el Señor, confiando en que Él sustenta el corazón quebrantado y da fuerzas cuando el rencor o la tristeza amenazan con abrumarnos.";

describe('variety across answers (round 4 finding 2)', () => {
  it('the same image in other words is caught: q04 "every shadow stretch tall" and x19 "every shadow look taller"', () => {
    expect(repeats(shapeOf(x19), [shapeOf(q04)])).toContain('repeat_image');
  });
  it('the "<verse> reminds us" closing shape is caught (x09 and x18)', () => {
    expect(repeats(shapeOf(x18), [shapeOf(x09)])).toContain('repeat_closing');
  });
  it('the Spanish night image comes back too (x20 and q08: "recuerda ... depositar", "invitación ... carga")', () => {
    expect(repeats(shapeOf(x20), [shapeOf(q08)])).toContain('repeat_image');
  });
  it('no exemption hides repetition (F6): two teen answers that send them to a parent, school counselor or pastor in the same words repeat', () => {
    expect(repeats(shapeOf(RT12), [shapeOf(RT11)])).toContain('repeat_image');
  });
  it('different answers pass (grief and job loss)', () => {
    expect(repeats(shapeOf(RT01), [shapeOf(q04), shapeOf(x09)])).toEqual([]);
  });
  it('the rewrite is told the words that came back, from the draft itself (x19 after q04)', () => {
    const later = shapeOf(x19);
    expect(varietyObjection(later, later.said, [shapeOf(q04)])).toMatch(/the way recent answers to other people did \(.*"quiet hours"/);
  });
  it('r8: the rewrite is an edit of the draft: only the repeating sentences are marked, references kept in place', () => {
    const recent = [shapeOf('Talk it over with your pastor so you can hear wise counsel. God is near.')];
    const draft = shapeOf('Jesus wept with His friends (John 11:35). Talk this over with your pastor so you can hear wise counsel. Grief is not a lack of faith.');
    const o = varietyObjection(draft, draft.said, recent);
    expect(o).toContain('Jesus wept with His friends (John 11:35).');
    expect(o).toContain('[REWRITE] Talk this over with your pastor so you can hear wise counsel.');
    expect(o).not.toContain('[REWRITE] Jesus wept');
    expect(o).not.toContain('[REWRITE] Grief');
    expect(varietyObjection(shapeOf('A new thing entirely.'), shapeOf('A new thing entirely.').said, recent)).toBe('');
  });
  it('hashed shapes compare like plain ones and keep no words', async () => {
    const [a, b] = await Promise.all([hashShape(shapeOf(q04), 'k'.repeat(32)), hashShape(shapeOf(x19), 'k'.repeat(32))]);
    expect(repeats(b, [a])).toContain('repeat_image');
    expect(JSON.stringify(a)).not.toMatch(/quie|shad|hour/);
    expect(a.pairs.every(p => /^[0-9a-f]{8}$/.test(p))).toBe(true);
  });
  it('rows are pruned to the last 12 per install, deleted with her memory and by the cron after 14 days', async () => {
    const id = crypto.randomUUID();
    const s = await hashShape(shapeOf(q04), 'k'.repeat(32));
    for (let i = 0; i < 15; i++) await saveShape(env.DB, id, s, NOW - 20 * 86400_000 + i);
    const mine = await env.DB.prepare('SELECT count(*) AS n FROM answer_shape WHERE scope = ?').bind(id).first<{ n: number }>();
    expect(mine?.n).toBe(12);
    expect((await recentShapes(env.DB, id)).length).toBeGreaterThanOrEqual(12);
    await deleteMemory(env.DB, id);
    expect((await env.DB.prepare('SELECT count(*) AS n FROM answer_shape WHERE scope = ?').bind(id).first<{ n: number }>())?.n).toBe(0);
    const removed = await cleanup(env.DB, NOW);
    expect(removed.shapes).toBeGreaterThan(0);
    expect((await env.DB.prepare('SELECT count(*) AS n FROM answer_shape WHERE at < ?').bind(NOW - 14 * 86400_000).first<{ n: number }>())?.n).toBe(0);
  });
});

describe('variety in the chat path', () => {
  it('r8: the edit asks for versions in one call, and the first that repeats nothing is shown', async () => {
    const first = good('Grief can sit heavy in the chest for a long while. Lord, hold us close tonight.', ['Psalm 34:18']);
    const again = good('Loss takes time to carry. Lord, hold us close tonight.', ['Psalm 34:18']);
    const a = scripted('workers-ai', [first]);
    const d = deps({ rungList: [a.rung] });
    const token = await tokenFor(d);
    const conversation = crypto.randomUUID();
    await chat(d, 'My mama died last week.', { token, body: { conversation } });
    const b = scripted('workers-ai', [again, { versions: [
      good('Loss takes time to carry. Lord, hold us close tonight.', ['Psalm 34:18']),
      good('Loss takes time to carry. May the Lord keep you near.', ['Psalm 34:18']),
    ] }]);
    const r = await chat(deps({ rungList: [b.rung] }), 'I still cry every day.', { token, body: { conversation } });
    expect(r.body.kind).toBe('answer');
    expect(r.body.text).toBe('Loss takes time to carry. May the Lord keep you near.');
    expect(b.calls.length).toBe(2);
  });
  it('her second answer that closes like her first is rewritten; a different one is shown', async () => {
    const first = good('Grief can sit heavy in the chest for a long while. Lord, hold us close tonight.', ['Psalm 34:18']);
    const again = good('Loss takes time to carry. Lord, hold us close tonight.', ['Psalm 34:18']);
    const fresh = good('Loss takes time to carry, and you do not carry it alone. May the Lord keep you near.', ['Psalm 34:18']);
    const a = scripted('workers-ai', [first]);
    const d = deps({ rungList: [a.rung] });
    const token = await tokenFor(d);
    const conversation = crypto.randomUUID(); // the free lane is one conversation a day
    expect((await chat(d, 'My mama died last week.', { token, body: { conversation } })).body.kind).toBe('answer');
    const b = scripted('workers-ai', [again, fresh]);
    const d2 = deps({ rungList: [b.rung] });
    const r = await chat(d2, 'I still cry every day.', { token, body: { conversation } });
    expect(r.body.kind).toBe('answer');
    expect(r.body.text).toContain('May the Lord keep you near');
    expect(b.calls.length).toBe(2);
    expect(b.calls[1].some(m => m.role === 'system' && /the last sentence must begin another way than "Lord, hold us"/.test(m.content) && m.content.includes('[REWRITE] Lord, hold us close tonight.') && m.content.includes('\nLoss takes time to carry.'))).toBe(true);
  });
  it('variety never causes a fallback: when every try repeats, the last clean draft is shown', async () => {
    const same = good('Grief can sit heavy for a while. Lord, hold us close tonight.', ['Psalm 34:18']);
    const d = deps({ rungList: [scripted('workers-ai', [same]).rung] });
    const token = await tokenFor(d);
    const conversation = crypto.randomUUID();
    await chat(d, 'My mama died.', { token, body: { conversation } });
    const r = await chat(d, 'My mama died and I miss her.', { token, body: { conversation } });
    expect(r.body.kind).toBe('answer');
  });
  it('a crisis reply is never stored as a shape', async () => {
    const before = (await env.DB.prepare("SELECT count(*) AS n FROM answer_shape WHERE scope = 'all'").first<{ n: number }>())?.n ?? 0;
    await call(deps(), '/api/chat', { body: { conversation: crypto.randomUUID(), messages: [{ role: 'user', text: 'I want to kill myself' }], door: 'faith', voice: 'plain', language: 'en' }, token: await tokenFor(deps()) });
    expect((await env.DB.prepare("SELECT count(*) AS n FROM answer_shape WHERE scope = 'all'").first<{ n: number }>())?.n ?? 0).toBe(before);
  });
});


// Hostile review of 25c474f (F1, F2): code no longer chooses any word of an answer. Two
// human-written answers in the voice go in ahead of the chat, rotated by a counter.
const assistantTexts = (messages: Message[]) => messages.filter(m => m.role === 'system').flatMap(m => [...m.content.matchAll(/^(?:The answer|La respuesta): (.*)$/gm)].map(x => (JSON.parse(x[1]) as { text: string }).text));
describe('voice samples, not a code plan', () => {
  it('two samples in the right voice go in ahead of her message, and they rotate from one chat to the next', async () => {
    const a = scripted('workers-ai', [good('Loss takes time to carry, and you do not carry it alone. May the Lord keep you near.')]);
    await chat(deps({ rungList: [a.rung] }), 'My mama died last week.', { body: { voice: 'church' } });
    const b = scripted('workers-ai', [good('Grief keeps its own clock, and God keeps company with it. Lord, stay close to us.')]);
    await chat(deps({ rungList: [b.rung] }), 'My mama died last week.', { body: { voice: 'church' } });
    const first = assistantTexts(a.calls[0]), second = assistantTexts(b.calls[0]);
    expect(first).toHaveLength(2);
    const church = SAMPLES.church.map(s => s.text);
    expect([...first, ...second].every(t => church.includes(t))).toBe(true);
    expect(second).not.toEqual(first);
    expect(a.calls[0].at(-1)).toEqual({ role: 'user', content: 'My mama died last week.' });
    // In one system message, never as chat turns the model could take for the conversation (run 44856144997 q14).
    expect(a.calls[0].filter(m => m.role !== 'system')).toEqual([{ role: 'user', content: 'My mama died last week.' }]);
  });
  it('no system message tells the model a word to use (F1: "the first word is", a picture)', async () => {
    const a = scripted('workers-ai', [good('Loss takes time to carry, and you do not carry it alone. May the Lord keep you near.')]);
    await chat(deps({ rungList: [a.rung] }), 'My mama died last week.');
    const system = a.calls[0].filter(m => m.role === 'system').map(m => m.content).join('\n');
    expect(system).not.toMatch(/first word is|primera palabra (?:sea|es)|a quilt|a compass|a harbor|una brújula/i);
  });
  it('a Spanish chat gets Spanish samples, a Mindset chat gets Mindset samples', async () => {
    const es = scripted('workers-ai', [good('Dios está cerca de quien tiene el corazón quebrantado. Señor, quédate cerca de nosotros.', ['Salmos 34:18'])]);
    await chat(deps({ rungList: [es.rung] }), 'Murió mi mamá.', { body: { voice: 'spanish', language: 'es', journey: 'Mi Refugio' } });
    expect(assistantTexts(es.calls[0]).every(t => SAMPLES.spanish.some(s => s.text === t))).toBe(true);
    const mind = scripted('workers-ai', [good('Breathe out slowly and let your shoulders drop. Tomorrow can wait its turn.', [])]);
    await chat(deps({ rungList: [mind.rung] }), 'I cannot sleep.', { body: { door: 'mindset' } });
    expect(assistantTexts(mind.calls[0]).every(t => SAMPLES.mindset.some(s => s.text === t))).toBe(true);
  });
  it('a rewrite for variety does not use up the tries a real problem needs: the repeat is shown, not the fallback', async () => {
    const first = good('Grief can sit heavy in the chest for a long while. Lord, hold us close tonight.', ['Psalm 34:18']);
    const repeat = good('Loss takes time to carry. Lord, hold us close tonight.', ['Psalm 34:18']);
    const stock = good('Somebody needs to hear this: God is near. Lord, be near us.', ['Psalm 34:18']);
    const d = deps({ rungList: [scripted('workers-ai', [first]).rung] });
    const token = await tokenFor(d);
    const conversation = crypto.randomUUID();
    await chat(d, 'My mama died last week.', { token, body: { conversation } });
    const b = scripted('workers-ai', [repeat, stock, stock]);
    const r = await chat(deps({ rungList: [b.rung] }), 'I still cry every day.', { token, body: { conversation } });
    expect(b.calls.length).toBe(3);
    expect(r.body.kind).toBe('answer');
    expect(r.body.text).toContain('Loss takes time to carry');
  });
  it('the spare still has to pass the judge', async () => {
    const first = good('Grief can sit heavy in the chest for a long while. Lord, hold us close tonight.', ['Psalm 34:18']);
    const d = deps({ rungList: [scripted('workers-ai', [first]).rung] });
    const token = await tokenFor(d);
    const conversation = crypto.randomUUID();
    await chat(d, 'My mama died last week.', { token, body: { conversation } });
    const r = await chat(deps({ rungList: [scripted('workers-ai', [first]).rung], judge: async () => ({ verdict: 'fail', which: ['condemns'], voice: 2 }) }), 'I still cry every day.', { token, body: { conversation } });
    expect(r.body.kind).toBe('fallback');
  });
  it('every spare is tried: when the newest fails the judge, an earlier one that passes is shown (round 6 r4-01)', async () => {
    const first = good('Grief can sit heavy in the chest for a long while. Lord, hold us close tonight.', ['Psalm 34:18']);
    const d = deps({ rungList: [scripted('workers-ai', [first]).rung] });
    const token = await tokenFor(d);
    const conversation = crypto.randomUUID();
    await chat(d, 'My mama died last week.', { token, body: { conversation } });
    const early = good('Loss takes time to carry. Lord, hold us close tonight.', ['Psalm 34:18']);
    const late = good('Loss takes time to carry, friend. Lord, hold us close tonight.', ['Psalm 34:18']);
    const judge = async (_env: unknown, input: { text: string }) => (input.text.includes('friend') ? { verdict: 'fail' as const, which: ['verse_read_in'], voice: 4 } : { verdict: 'pass' as const, voice: 5 });
    const r = await chat(deps({ rungList: [scripted('workers-ai', [early, late, late]).rung], judge }), 'I still cry every day.', { token, body: { conversation } });
    expect(r.body.kind).toBe('answer');
    expect(r.body.text).toBe('Loss takes time to carry. Lord, hold us close tonight.');
  });
  it('an answer the judge finds only plain (voice_low) is kept and shown before any fallback', async () => {
    const plainOne = good('Loss is hard, and grief takes time. May God give you rest.');
    const r = await chat(deps({ rungList: [scripted('workers-ai', [plainOne]).rung], judge: async () => ({ verdict: 'fail', which: ['voice_low'], voice: 3 }) }), 'My mama died last week.');
    expect(r.body.kind).toBe('answer');
    expect(r.body.text).toBe(plainOne.text);
  });
});

describe('her own topic is not an image (run 12)', () => {
  it('pairs whose words she wrote are not compared; a pair she did not write still is', () => {
    const q = 'Is sex before marriage a sin if we are engaged?';
    const a = withoutTopic(shapeOf('Scripture keeps sex for marriage, and that is a gift, not a cage. Talk with your pastor about the wait. Lord, give us clear eyes and a steady heart.'), q);
    const b = withoutTopic(shapeOf('The Bible places sex inside marriage as something good. Ask your pastor to walk the wait with you. Lord, give us clear eyes and a steady heart.'), q);
    expect(a.pairs.some(p => p === 'sex marr')).toBe(false);
    expect(repeats(a, [b])).toContain('repeat_image'); // "clear eyes", "eyes heart": not her words
    const c = withoutTopic(shapeOf('Waiting can feel long. God honors the two of you choosing it. Lord, help us wait well.'), q);
    expect(repeats(c, [b])).not.toContain('repeat_image');
  });
});
