// The crisis design (owner, 21 Nov 2026, after a hostile review): intent phrases only (never single
// words), a distress pre-filter that keeps unclear messages from free models, the answer model's own
// risk tag, the safety model only on a signal, two thresholds, the check-in once, a crisis lane that
// decays, hotlines by the device region, and no crisis words in any log.
import { env } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import phrases from './fixtures/crisis-phrases.json';
import { CRISIS_THINKING_HEADROOM, distress, floor } from '../src/crisis';
import { centralDay } from '../src/day';
import { FREE_CHAT_MESSAGES } from '../src/shared';
import { limitText } from '../src/replies';
import { call, chat, chatBody, deps, good, NOW, scripted, tokenFor } from './helpers';

afterEach(() => vi.restoreAllMocks());
const HOUR = 3600_000;

describe('intent phrases, never single words', () => {
  it.each(phrases.bible)('a Bible question is never a card: %s', async text => {
    expect(floor([{ role: 'user', text }]).sure).toBeNull();
  });
  it.each(phrases.crisis)('a first-person intent phrase is the card from the floor alone: %s', text => {
    expect(floor([{ role: 'user', text }]).sure).not.toBeNull();
  });
  it('the lists are the size the owner asked for (40 and 40)', () => {
    expect(phrases.bible.length).toBe(40);
    expect(phrases.crisis.length).toBe(40);
  });
  it('the pre-filter catches unclear distress and leaves negations and Bible study alone', () => {
    const u = (text: string) => [{ role: 'user' as const, text }];
    expect(distress(u('I feel so hopeless lately'))).toBe(true);
    expect(distress(u('ya no aguanto más'))).toBe(true);
    expect(distress(u("I'm not hopeless, just tired"))).toBe(false);
    expect(distress(u('How did David kill Goliath?'))).toBe(false);
    expect(distress(u('How do I forgive my sister?'))).toBe(false);
  });
});

// One conversation, driven turn by turn, with a private crisis model and a free model that must stay unused when it should.
function convo(over: Parameters<typeof deps>[0] = {}) {
  const free = scripted('gemini-free', [{ ...good(), risk: 'none' }]);
  // The crisis model: its words before a check-in (no number, no question), or an answer that keeps 988 after a card.
  const crisisCalls: unknown[] = [];
  const crisis = { calls: crisisCalls, rung: { id: 'crisis-gemini:test', cap: 1000, day: '2026-11-20', call: async (m: unknown, schema: { properties: Record<string, unknown> }) => {
    crisisCalls.push(m);
    // After a check-in the answer keeps the 988 line (the answer gate asks for it); before one it has no number.
    const carded = JSON.stringify(m).includes('Are you safe right now');
    return 'references' in schema.properties || 'versions' in schema.properties
      ? { ...good(carded ? 'You can rest a moment here, and God stays close. You can call or text 988 any time. Lord, keep us tonight.' : 'You can rest a moment here, and God stays close. Lord, keep us tonight.', ['Psalm 4:8']), risk: 'none' }
      : { text: 'That sounds like so much to hold tonight. You do not have to hold it alone.' };
  } } as never as import('../src/ladder').LadderRung };
  const d = deps({ rungs: (_e, _n, lane) => (lane === 'crisis' ? [crisis.rung] : [free.rung]), ...over });
  const conversation = crypto.randomUUID();
  let token = '';
  const history: Array<{ role: 'user' | 'assistant'; text: string }> = [];
  const say = async (text: string, body: Record<string, unknown> = {}) => {
    token ||= await tokenFor(d);
    history.push({ role: 'user', text });
    const res = await call(d, '/api/chat', { token, body: { ...chatBody(''), messages: history, conversation, ...body } });
    const r = (await res.json()) as { kind: string; text: string; checkIn?: { text: string; ai: boolean } };
    history.push({ role: 'assistant', text: r.checkIn?.text ?? r.text });
    return r;
  };
  return { d, free, crisis, say, conversation };
}

describe('the check-in, once', () => {
  it('a high signal shows the card and the check-in at once; the conversation is never stopped', async () => {
    const c = convo();
    const r = await c.say('I want to kill myself');
    expect(r.kind).toBe('crisis');
    expect(r.text).toContain('988');
    expect(r.checkIn?.text).toMatch(/Are you safe right now\?$/);
    // The intent phrase reached no model: its words are fixed.
    expect(r.checkIn?.ai).toBe(false);
    expect(c.free.calls.length + c.crisis.calls.length).toBe(0);
  });
  it('"no" to the check-in: the card again, and the crisis model stays', async () => {
    const c = convo();
    await c.say('I want to kill myself');
    const r = await c.say('no');
    expect(r.kind).toBe('crisis');
    expect(r.text).toContain('988');
  });
  it('"I\'m okay" to the check-in: answered normally on the crisis model, no card, and no second check-in', async () => {
    const c = convo({ risk: async (_e, turns) => /kill|hopeless/.test(turns.at(-1)!.text) ? { verdict: 'risk', kind: 'selfharm' } : { verdict: 'none' } });
    await c.say('I want to kill myself');
    const fine = await c.say("I'm okay now, thank you");
    expect(fine.kind).toBe('answer');
    expect(fine.checkIn).toBeUndefined();
    const calm = await c.say('Can you pray with me about tomorrow?');
    expect(calm.kind).not.toBe('crisis');
    expect(c.free.calls.length).toBe(0);
    expect(c.crisis.calls.length).toBeGreaterThan(0);
  });
  it('a low-confidence signal (indirect, unconfirmed) switches models silently: no card, no question', async () => {
    const c = convo({ riskVerdict: { verdict: 'risk', kind: 'selfharm', level: 'low' } });
    const r = await c.say('I feel so hopeless lately');
    expect(r.kind).toBe('answer');
    expect(r.checkIn).toBeUndefined();
    expect(c.free.calls.length).toBe(0);
  });
  it('the crisis model\'s own words lead a high signal it confirmed, then the check-in', async () => {
    const c = convo({ riskVerdict: { verdict: 'risk', kind: 'selfharm' } });
    const r = await c.say('I feel so hopeless, nothing matters anymore');
    expect(r.kind).toBe('crisis');
    expect(r.checkIn).toEqual({ text: 'That sounds like so much to hold tonight. You do not have to hold it alone. Are you safe right now?', ai: true });
  });
});

describe('the crisis lane answers', () => {
  it('a crisis-lane answer has room to think before it writes (run 10d: 21 of 48 cut off at 350 tokens)', async () => {
    const maxes: number[] = [];
    const c = convo({ riskVerdict: { verdict: 'risk', kind: 'selfharm', level: 'low' } });
    const inner = c.crisis.rung.call;
    c.crisis.rung.call = (async (m: never, s: never, max: number) => { maxes.push(max); return inner(m, s, max); }) as never;
    expect((await c.say('I feel so hopeless lately')).kind).toBe('answer');
    expect(maxes.length).toBeGreaterThan(0);
    expect(Math.min(...maxes)).toBeGreaterThanOrEqual(Number(env.ANSWER_MAX_TOKENS) + CRISIS_THINKING_HEADROOM);
    expect(CRISIS_THINKING_HEADROOM).toBeGreaterThanOrEqual(2048);
  });
});

describe('the crisis model gives nothing', () => {
  it('an empty crisis-lane answer is the fixed check-in and her region\'s lines, never "resting" (review F2)', async () => {
    for (const [region, line] of [['US', '988'], ['MX', '800 911 2000']] as const) {
      const c = convo({ riskVerdict: { verdict: 'risk', kind: 'selfharm', level: 'low' } });
      c.crisis.rung.call = (async () => { throw new Error('busy'); }) as never;
      const r = await c.say('I feel so hopeless lately', { region });
      expect(r.kind, region).toBe('crisis');
      expect(r.text, region).toContain(line);
      expect(r.text).not.toMatch(/resting|give it a minute/i);
      expect(r.checkIn).toEqual({ text: expect.stringMatching(/Are you safe right now\?$/), ai: false });
      expect(c.free.calls.length).toBe(0);
    }
  });
  it('the crisis check-in words have room to think too (600 plus the same headroom as answers)', async () => {
    const maxes: number[] = [];
    const c = convo({ riskVerdict: { verdict: 'risk', kind: 'selfharm' } });
    const inner = c.crisis.rung.call;
    c.crisis.rung.call = (async (m: never, s: { properties: Record<string, unknown> }, max: number) => { if (!('references' in s.properties) && !('versions' in s.properties)) maxes.push(max); return inner(m, s as never, max); }) as never;
    expect((await c.say('I feel so hopeless, nothing matters anymore')).kind).toBe('crisis');
    expect(maxes).toEqual([600 + CRISIS_THINKING_HEADROOM]);
  });
});

describe('the crisis lane decays', () => {
  it('back to the normal lane after 10 calm turns', async () => {
    const c = convo({ paidNow: true });
    await c.say('I want to kill myself');
    await c.say("I'm okay now");
    for (let i = 0; i < 10; i++) await c.say(`Thank you, tell me about Psalm ${i + 1}`);
    const before = c.crisis.calls.length;
    await c.say('What does Psalm 23 mean?');
    expect(c.crisis.calls.length).toBe(before); // answered on her normal (paid) lane
    const row = await env.DB.prepare('SELECT calm FROM chat_crisis WHERE conversation = ?').bind(c.conversation).first<{ calm: number }>();
    expect(row!.calm).toBeGreaterThanOrEqual(10);
  });
  it('back to the normal lane after 24 hours', async () => {
    let now = NOW;
    const c = convo({ now: () => now, paidNow: true });
    await c.say('I want to kill myself');
    now += 25 * HOUR;
    const before = c.crisis.calls.length;
    expect((await c.say('What does Psalm 23 mean?')).kind).not.toBe('crisis');
    expect(c.crisis.calls.length).toBe(before);
  });
});

describe('hotlines by the device region, never by language alone', () => {
  it.each([
    ['MX', 'es', /800 911 2000/],
    ['ES', 'es', /024/],
    ['GB', 'en', /findahelpline\.com/],
    ['US', 'es', /988 y oprime 2/],
  ] as const)('%s', async (region, language, line) => {
    const c = convo();
    const r = await c.say(language === 'es' ? 'me quiero matar' : 'I want to kill myself', { region, language, voice: language === 'es' ? 'spanish' : 'plain' });
    expect(r.text).toMatch(line);
    if (region !== 'US') expect(r.text).not.toContain('988');
  });
});

describe('the safety model\'s own budget', () => {
  it('past SAFETY_MONTHLY_CAP_USD the safety read is skipped, the owner is alerted once, and chat carries on', async () => {
    const log = vi.spyOn(console, 'log');
    await env.DB.prepare("INSERT INTO chat_counts VALUES ('2026-11-02', 'safety_micro', 10000000) ON CONFLICT DO UPDATE SET n = 10000000").run();
    const c = convo();
    const r = await c.say('I feel so hopeless lately');
    await convo().say('ya no aguanto más');
    expect(r.kind).toBe('answer');
    expect(c.d.riskCalls).toBe(0);
    expect(log.mock.calls.flat().join(' ').match(/NAMED STOP CHAT_SAFETY_MONTHLY_CAP/g)?.length).toBe(1);
    await env.DB.prepare("DELETE FROM chat_counts WHERE metric = 'safety_micro' OR metric LIKE 'safety_cap_alert:%'").run();
  });
  it('at 80% of it the owner is alerted once and the read still runs', async () => {
    const log = vi.spyOn(console, 'log');
    await env.DB.prepare("INSERT INTO chat_counts VALUES ('2026-11-02', 'safety_micro', 8000000) ON CONFLICT DO UPDATE SET n = 8000000").run();
    const c = convo();
    await c.say('I feel so hopeless lately');
    expect(c.d.riskCalls).toBe(1);
    expect(log.mock.calls.flat().join(' ')).toMatch(/CHAT_SAFETY_CAP_80/);
    await env.DB.prepare("DELETE FROM chat_counts WHERE metric = 'safety_micro' OR metric LIKE 'safety_cap_alert:%'").run();
  });
});

describe('no crisis words in any log', () => {
  it('counts and reasons only', async () => {
    const log = vi.spyOn(console, 'log');
    const err = vi.spyOn(console, 'error');
    const c = convo({ riskVerdict: { verdict: 'down' } });
    await c.say('I want to kill myself ZEBRA-7731');
    await c.say('no ZEBRA-7731');
    await c.say('I feel so hopeless ZEBRA-7731');
    expect([...log.mock.calls, ...err.mock.calls].flat().join(' ')).not.toContain('ZEBRA-7731');
  });
});

describe('the crisis model\'s words (run 10 root cause)', () => {
  it('a question of its own is dropped, never the whole reply; a number or a method still refuses it', async () => {
    const { crisisWords } = await import('../src/crisis');
    expect(crisisWords({ text: 'That sounds so heavy. Can you tell me more? You are not alone in this.' })).toBe('That sounds so heavy. You are not alone in this.');
    expect(crisisWords({ text: 'Call 988 now.' })).toBeNull();
    expect(crisisWords({ text: 'Put the pills away.' })).toBeNull();
    expect(crisisWords({ text: 'Can you talk to someone?' })).toBeNull();
  });
});

describe('the answer-side tripwire asks the safety model for the kind (run 12)', () => {
  const reach = 'If you are ever in danger at home, call 911 or the 988 line right away. God sees what is done to people in the dark. Lord, keep us safe and seen.';
  it('a husband\'s control the safety model reads as abuse gets the abuse card, not the 988 one', async () => {
    const r = await chat(deps({ riskVerdict: { verdict: 'risk', kind: 'abuse', level: 'high' }, rungList: [scripted('gemini-free', [good(reach, [])]).rung] }), "My husband takes my whole paycheck and won't let me see my sister. My pastor says I'm supposed to submit. Is that biblical?");
    expect(r.body.kind).toBe('crisis');
    expect(r.body.crisis).toBe('abuse');
  });
  it('a plain question about Scripture the safety model reads as calm is written again without crisis lines: no card', async () => {
    const rung = scripted('gemini-free', [good(reach, []), good('Tamar was wronged, and the Bible tells it plainly as a crime against her, never her fault (2 Samuel 13:12-13). God sees the people others hurt. Lord, help us honor those who were wronged.', ['Psalm 9:9'])]);
    const d = deps({ riskVerdict: { verdict: 'none' }, rungList: [rung.rung] });
    const r = await chat(d, 'What does the Bible say about the rape of Tamar in 2 Samuel 13?');
    expect(r.body.kind).toBe('answer');
    expect(rung.calls.length).toBe(2);
    expect(String(rung.calls[1].at(-1)?.content ?? '') + JSON.stringify(rung.calls[1])).toMatch(/no crisis lines/);
  });
  it('the same reach on a message that is not about Scripture stays a card, toward safety', async () => {
    const r = await chat(deps({ riskVerdict: { verdict: 'none' }, rungList: [scripted('gemini-free', [good(reach, [])]).rung] }), 'Things at home have been really tense lately.');
    expect(r.body.kind).toBe('crisis');
  });
});

const iidOf = (token: string) => JSON.parse(atob(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))).iid as string;
describe('distress past the free day is answered, never walled (review 21 Nov 2026)', () => {
  const fill = async (token: string, conversation: string) => {
    const id = iidOf(token);
    for (let i = 0; i < FREE_CHAT_MESSAGES; i++) await env.DB.prepare('INSERT INTO chat_admission VALUES (?, ?, ?, ?, 0, ?, 1000, 100000, ?)').bind(centralDay(NOW), id, conversation, 'h', FREE_CHAT_MESSAGES, NOW).run();
  };
  it('a free user at FREE_CHAT_MESSAGES of FREE_CHAT_MESSAGES sends "I feel so hopeless lately": the crisis lane answers, with the hotline, never the limit text', async () => {
    expect(distress([{ role: 'user', text: 'I feel so hopeless lately' }])).toBe(true);
    const crisis = scripted('crisis-gemini', [{ ...good('That heaviness is real, and you do not have to carry it alone tonight. If it gets darker, call or text 988 any time. Lord, stay near us.', ['Psalm 34:18']), risk: 'none' }]);
    const free = scripted('gemini-free', [good()]);
    const d = deps({ riskVerdict: { verdict: 'risk', kind: 'selfharm', level: 'low' }, rungs: (_e, _n, lane) => (lane === 'crisis' ? [crisis.rung] : [free.rung]) });
    const token = await tokenFor(d);
    const conversation = crypto.randomUUID();
    await fill(token, conversation);
    const body = (await (await call(d, '/api/chat', { token, body: { ...chatBody('I feel so hopeless lately'), conversation } })).json()) as { kind: string; text: string };
    expect(body.kind).not.toBe('limit');
    expect(body.text).not.toBe(limitText.en);
    expect(body.text).toMatch(/988/);
    expect(crisis.calls.length).toBeGreaterThan(0);
    expect(free.calls.length).toBe(0);
  });
  it('a message on the floor list past the free day gets the crisis card', async () => {
    const d = deps({ rungList: [scripted('gemini-free', [good()]).rung] });
    const token = await tokenFor(d);
    const conversation = crypto.randomUUID();
    await fill(token, conversation);
    const body = (await (await call(d, '/api/chat', { token, body: { ...chatBody('I want to kill myself'), conversation } })).json()) as { kind: string; text: string };
    expect(body.kind).toBe('crisis');
    expect(body.text).toMatch(/988/);
  });
});

describe('a flagged conversation is never cut off by the free day (her ruling 21 Nov 2026)', () => {
  it('past FREE_CHAT_MESSAGES, the flagged conversation still answers (on the crisis model); an unflagged one gets the limit', async () => {
    const crisis = scripted('crisis-gemini', [{ ...good('You can rest a moment here, and God stays close. Lord, keep us tonight.', ['Psalm 4:8']), risk: 'none' }]);
    const free = scripted('gemini-free', [good()]);
    const d = deps({ rungs: (_e, _n, lane) => (lane === 'crisis' ? [crisis.rung] : [free.rung]) });
    const token = await tokenFor(d);
    const conversation = crypto.randomUUID();
    const id = iidOf(token);
    for (let i = 0; i < FREE_CHAT_MESSAGES; i++) await env.DB.prepare('INSERT INTO chat_admission VALUES (?, ?, ?, ?, 0, ?, 1000, 100000, ?)').bind(centralDay(NOW), id, conversation, 'h', FREE_CHAT_MESSAGES, NOW).run();
    await env.DB.prepare('INSERT INTO chat_crisis (install_id, conversation, flagged_at, calm, asked) VALUES (?, ?, ?, 0, 1)').bind(id, conversation, NOW - 60_000).run();
    const r = await call(d, '/api/chat', { token, body: { ...chatBody('I still feel so heavy tonight'), conversation } });
    const body = (await r.json()) as { kind: string; remaining: number | null };
    expect(body.kind).not.toBe('limit');
    expect(crisis.calls.length).toBeGreaterThan(0);
    await env.DB.prepare('DELETE FROM chat_crisis WHERE install_id = ?').bind(id).run();
    const after = (await (await call(d, '/api/chat', { token, body: { ...chatBody('one more question'), conversation } })).json()) as { kind: string };
    expect(after.kind).toBe('limit');
  });
});
