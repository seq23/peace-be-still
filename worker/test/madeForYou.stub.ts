// Local Worker for this lane's tests only. It binds createMadeForYou to phase 3's real modules (the
// ladder, checkAnswer, the judge's schema and verdict, the report reasons), resolved by the test bundler
// to a phase 3 checkout, and fakes only what costs money or leaves the machine: provider calls, the
// install token, RevenueCat and the private bucket (an R2 binding here, the presigner in production).
//
// INTEGRATION (phase 3's worker/src/index.ts): mount createMadeForYou(...) before NOT_FOUND, call its
// scheduled() from the hourly cron, and in report() after parseJson:
//   if (raw && typeof raw === 'object' && 'session' in raw) return madeForYou.report(who.installId, raw, now);
// (after the same token, CHAT_BURST and REPORTS_DAILY checks), exactly as /api/report does below.
import { realDeps } from '../src/index';
import { runLadder } from '../src/ladder';
import { bump, reserve } from '../src/counts';
import { centralDay } from '../src/day';
import { RungError } from '../src/providers/types';
import { checkAnswer } from '../src/quality/answer';
import { banned } from '../src/shared';
import { judgeSchema, judgeVerdict, JUDGE_CHECKS } from '../src/quality/judge';
import { parseReport, saveReport, REPORTS_DAILY } from '../src/report';
import chatConfig from 'chat-vars';
import { createMadeForYou, madeForYouEnv, madeForYouRungs, SESSION_CHECKS, verbatimScripture, type MadeForYouDependencies } from '../src/madeForYou';
import { cleanDraft } from './fixtures/madeForYouDraft.mjs';
import { r2Private } from '../src/madeForYou.storage';

type Env = {
  DB: MadeForYouDependencies['db'] & D1Database;
  AUDIO: {
    get(key: string): Promise<{ body: ReadableStream; arrayBuffer(): Promise<ArrayBuffer> } | null>;
    head(key: string): Promise<unknown>;
    put(key: string, body: ReadableStream | ArrayBuffer): Promise<unknown>;
    delete(key: string): Promise<void>;
  };
};

export const example = {
  owner: '10000000-0000-4000-a000-000000000001',
  other: '10000000-0000-4000-a000-000000000002',
  free: '10000000-0000-4000-a000-000000000003',
  limited: '10000000-0000-4000-a000-000000000004',
  lapsed: '10000000-0000-4000-a000-000000000005',
  secret: 'local-runner',
};
// Any well-formed install id is a valid token here, so capacity tests can use many installs.
const isInstall = (value: string | undefined): value is string => !!value && /^[0-9a-f-]{36}$/.test(value);
const central = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' });

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const now = Number(request.headers.get('x-test-now')) || Date.now();
    const header = (name: string) => new Set(request.headers.get(name)?.split(',').filter(Boolean));
    const down = header('x-test-models-down');
    // x-test-models-429: those rungs answer 429 (rate-limited) instead of failing.
    const rateLimited = header('x-test-models-429');
    for (const id of rateLimited) down.add(id);
    const short = header('x-test-models-short');
    const judgeMode = request.headers.get('x-test-judge') ?? 'pass';
    const revisions: string[] = [];
    // The production client with no secrets: every storage call is the named stop MADE_FOR_YOU_STORAGE_CONFIG.
    const unconfigured = request.headers.get('x-test-storage') === 'unset' ? r2Private({}) : null;
    const service = createMadeForYou({
      db: env.DB,
      now: () => now,
      centralDay: value => central.format(value),
      allowedRegion: () => true,
      install: async req => {
        const installId = req.headers.get('authorization')?.replace(/^Bearer /, '');
        return isInstall(installId) ? { installId, age: 'adult' } : null;
      },
      limit: async id => id !== example.limited,
      paid: async id => id === example.free ? { paid: false, paidUntil: null }
        : id === example.lapsed ? { paid: false, paidUntil: now - 40 * 86_400_000 } : { paid: true, paidUntil: now + 30 * 86_400_000 },
      detectCrisis: async ([{ text }]) => {
        if (text === 'fixture floor' || text === 'fixture model') return { fired: true, kind: text };
        return { fired: false, read: text === 'fixture unavailable' ? 'down' : 'none' };
      },
      crisisText: () => 'Fixed safety reply',
      // The chat's real ladder over the chat's real rung list, with made-for-you counters and caps.
      ladder: async (use, messages, schema, maxTokens, valid, signal, paidOnly) => {
        const fixture = (rung: { id: string }) => async () => {
            if (down.has(rung.id) || down.has(rung.id.split(':')[0])) throw new RungError(rateLimited.has(rung.id.split(':')[0]) ? 'rate_limited' : 'failed', 'FIXTURE_MODEL_DOWN');
            if (use === 'judge') {
              if (judgeMode === 'down') throw new RungError('failed', 'FIXTURE_MODEL_DOWN');
              const flags = Object.fromEntries([...JUDGE_CHECKS, ...SESSION_CHECKS].map(k => [k, false]));
              return { ...flags, odd_phrase: '', health_or_outcome_promise: judgeMode === 'fail', voice: 5 };
            }
            const lang = messages[0].content.includes('Spanish') ? 'es' : 'en';
            const paragraphs = cleanDraft(lang, short.has(rung.id) || short.has(rung.id.split(':')[0]) ? 2 : 4).split('\n\n');
            // The writer's mark sits in paragraph 3, the one a flawed draft's revision rewrites (the rest are kept as drafted).
            paragraphs[2] += ` This draft came from ${rung.id}.`;
            // x-test-draft: flawed → the first draft leans on an AI word and is short; a revision request fixes it.
            const revising = messages[messages.length - 1].content.startsWith('Revise');
            // x-test-draft: stubborn → a free model's every draft and revision keeps the fault; only the paid rung fixes it.
            const mode = request.headers.get('x-test-draft');
            if (mode === 'flawed' && !revising || mode === 'stubborn' && rung.id !== 'paid') {
              paragraphs[2] = paragraphs[2].split(' ').slice(0, 40).join(' ') + ' A profound calm fills the room.';
            }
            if (revising) revisions.push(messages[messages.length - 1].content);
            return { paragraphs };
        };
        const rungs = realDeps.rungs(madeForYouEnv(chatConfig as unknown as Env & Cloudflare.Env), now).map(rung => ({ ...rung, call: fixture(rung) }));
        const share = { book: (day: string, metric: string, cap: number) => reserve(env.DB, day, metric, cap), out: () => new RungError('exhausted', 'MFY_SHARE_USED') };
        // The private paid rung (her ruling 21 Nov 2026): last, answered by the same fixture, priced; its spend is booked
        // into chat's paid_spend_micro as madeForYou.mount.ts does. x-test-paid: off leaves it out (the monthly cap).
        const answer = fixture({ id: 'paid' });
        const paid = request.headers.get('x-test-paid') === 'off' ? null : {
          day: new Date(now).toISOString().slice(0, 10),
          call: async (_m: unknown, _s: unknown, _t: number, onUsage?: (u: { in: number; out: number; think: number }) => void) => {
            // x-test-paid: 402 / 403 → what phase 3's httpJson throws for a key out of credit or past its limit.
            const refused = request.headers.get('x-test-paid');
            if (refused === '402' || refused === '403') throw new RungError('failed', `HTTP_${refused}`);
            const data = await answer();
            onUsage?.({ in: 3000, out: 1800, think: 0 });
            return data;
          },
        };
        const metrics = new Map<string, number>();
        try { return await runLadder(env.DB, madeForYouRungs(rungs, use, share, signal, paid as never, paidOnly), messages, schema as never, maxTokens, metrics, valid); }
        finally { const micro = metrics.get('paid_spend_micro') ?? 0; if (micro > 0) await bump(env.DB, centralDay(now), 'paid_spend_micro', micro); }
      },
      checkProse: (draft, ctx) => checkAnswer(draft, { ...ctx, db: env.DB }),
      verbatim: (translation, text) => verbatimScripture(env.DB, translation, text),
      judgeShared: { schema: judgeSchema, verdict: judgeVerdict },
      banned,
      psalm: async (translation, psalm) => {
        const { results } = await env.DB.prepare("SELECT text FROM bible_verses WHERE translation = ? AND book = 'PSA' AND chapter = ? AND verse <= ? ORDER BY verse")
          .bind(translation, psalm.chapter, psalm.verses).all<{ text: string }>();
        return results.map(row => row.text);
      },
      hasAudio: async key => !!await env.AUDIO.head(key),
      playUrl: async key => unconfigured ? unconfigured.playUrl(key) : `${url.origin}/_test-media/${key}?ticket=local-only`,
      deleteAudio: async key => { await env.AUDIO.delete(key); },
      copyAudio: async (from, to) => {
        const object = await env.AUDIO.get(from);
        if (!object) throw new Error('missing');
        await env.AUDIO.put(to, await object.arrayBuffer());
      },
      runnerSecret: example.secret,
    });
    if (url.pathname === '/_test-cleanup') return Response.json(await service.scheduled());
    if (url.pathname === '/api/report' && request.method === 'POST') {
      // Phase 3's report(), with the one added branch for sessions.
      const installId = request.headers.get('authorization')?.replace(/^Bearer /, '');
      if (!isInstall(installId)) return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
      const raw = await request.json().catch(() => null) as Record<string, unknown> | null;
      if (!(await reserve(env.DB, central.format(now), 'reports', REPORTS_DAILY))) return Response.json({ error: 'SLOW_DOWN' }, { status: 429 });
      if (raw && 'session' in raw) return service.report(installId, raw, now);
      const parsed = parseReport(raw);
      if (!parsed) return Response.json({ error: 'BAD_REQUEST' }, { status: 400 });
      await saveReport(env.DB, parsed, now);
      return Response.json({ reported: true });
    }
    if (url.pathname.startsWith('/_test-media/')) {
      const key = url.pathname.slice('/_test-media/'.length);
      if (request.method === 'PUT' && request.headers.get('authorization') === `Bearer ${example.secret}` && request.body) {
        await env.AUDIO.put(key, request.body);
        return new Response(null, { status: 204 });
      }
      if (request.method !== 'GET' || url.searchParams.get('ticket') !== 'local-only') return new Response(null, { status: 403 });
      const object = await env.AUDIO.get(key);
      return object ? new Response(object.body) : new Response(null, { status: 404 });
    }
    const answered = await service.fetch(request) ?? new Response(null, { status: 404 });
    if (!revisions.length) return answered;
    // The revision requests the model received, for the test to read (fixture data only).
    const headers = new Headers(answered.headers);
    headers.set('x-test-revisions', encodeURIComponent(JSON.stringify(revisions)));
    return new Response(answered.body, { status: answered.status, headers });
  },
};
