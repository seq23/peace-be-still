// "Report this answer" (Apple Guideline 1.2): the answer and a reason are kept, never her message or
// anything that identifies her, and reports go after 90 days.
import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { cleanup } from '../src/cleanup';
import { call, chat, deps, good, NOW, scripted, tokenFor } from './helpers';

const DAY = 86400_000;
const iid = (token: string) => JSON.parse(atob(token.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))).iid as string;

describe('report this answer', () => {
  it('keeps the answer, the reason and the time; never her message, install id or IP', async () => {
    const d = deps({ rungList: [scripted('workers-ai', [good()]).rung] });
    const r = await chat(d, 'MY-MESSAGE-SENTINEL my mama died', { ip: '198.51.100.99' });
    expect(r.body.kind).toBe('answer');
    const res = await call(d, '/api/report', { token: r.token, ip: '198.51.100.99', body: { answer: r.body.text, reason: 'wrong' } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reported: true });
    const rows = (await env.DB.prepare('SELECT * FROM answer_report').all()).results;
    const row = rows.find(x => (x as { answer: string }).answer === r.body.text) as Record<string, unknown>;
    expect(row).toMatchObject({ reason: 'wrong', at: NOW });
    expect(Object.keys(row).sort()).toEqual(['answer', 'at', 'reason']);
    const all = JSON.stringify(rows);
    expect(all).not.toContain('MY-MESSAGE-SENTINEL');
    expect(all).not.toContain(iid(r.token));
    expect(all).not.toContain('198.51.100.99');
  });
  it('needs a valid token, a known reason and an answer', async () => {
    const d = deps();
    const token = await tokenFor(d);
    expect((await call(d, '/api/report', { body: { answer: 'x', reason: 'wrong' } })).status).toBe(401);
    expect((await call(d, '/api/report', { token, body: { answer: 'x', reason: 'spam' } })).status).toBe(400);
    expect((await call(d, '/api/report', { token, body: { answer: '  ', reason: 'other' } })).status).toBe(400);
    expect((await call(d, '/api/report', { token, body: { answer: 'y'.repeat(4001), reason: 'other' } })).status).toBe(400);
  });
  it('reports are deleted after 90 days', async () => {
    await env.DB.prepare("INSERT INTO answer_report (at, reason, answer) VALUES (?, 'other', 'OLD-REPORT')").bind(NOW - 91 * DAY).run();
    await env.DB.prepare("INSERT INTO answer_report (at, reason, answer) VALUES (?, 'other', 'NEW-REPORT')").bind(NOW - 89 * DAY).run();
    const removed = await cleanup(env.DB, NOW);
    expect(removed.reports).toBeGreaterThan(0);
    expect(await env.DB.prepare("SELECT 1 FROM answer_report WHERE answer = 'OLD-REPORT'").first()).toBeNull();
    expect(await env.DB.prepare("SELECT 1 FROM answer_report WHERE answer = 'NEW-REPORT'").first()).not.toBeNull();
  });
});
