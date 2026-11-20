// Local Worker only. Production adapters are supplied by the phase 3 router and private R2 signer.
import { createMadeForYou, type MadeForYouDependencies } from './madeForYou';

type Env = {
  DB: MadeForYouDependencies['db'];
  AUDIO: {
    get(key: string): Promise<{ body: ReadableStream } | null>;
    head(key: string): Promise<unknown>;
    put(key: string, body: ReadableStream): Promise<unknown>;
  };
};

export const example = {
  owner: '10000000-0000-4000-a000-000000000001',
  other: '10000000-0000-4000-a000-000000000002',
  free: '10000000-0000-4000-a000-000000000003',
  limited: '10000000-0000-4000-a000-000000000004',
  secret: 'local-runner',
};

const central = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' });

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const now = Number(request.headers.get('x-test-now')) || Date.now();
    const service = createMadeForYou({
      db: env.DB,
      now: () => now,
      centralDay: value => central.format(value),
      allowedRegion: () => true,
      install: async req => {
        const installId = req.headers.get('authorization')?.replace(/^Bearer /, '');
        return installId && [example.owner, example.other, example.free, example.limited].includes(installId)
          ? { installId, age: 'adult' } : null;
      },
      limit: async id => id !== example.limited,
      paid: async id => id !== example.free,
      detectCrisis: async ([{ text }]) => {
        if (text === 'fixture floor' || text === 'fixture model') return { fired: true, kind: text };
        return { fired: false, read: text === 'fixture unavailable' ? 'down' : 'none' };
      },
      crisisText: () => 'Fixed safety reply',
      draft: async (_messages, _schema, valid) => {
        const draft = { text: 'The rain on the window is soft. Let the room be quiet for a moment.' };
        return valid(draft) ? draft : null;
      },
      approve: async () => request.headers.get('x-test-reject') !== 'yes',
      psalm: async translation => {
        const data = await env.DB.prepare('SELECT text FROM bible_verses WHERE translation = ? ORDER BY verse')
          .bind(translation).all<{ text: string }>();
        return data.results.map(row => row.text);
      },
      hasAudio: async key => !!await env.AUDIO.head(key),
      playUrl: async key => `${url.origin}/_test-media/${key}?ticket=local-only`,
      runnerSecret: example.secret,
    });
    if (url.pathname === '/_test-cleanup') {
      await service.scheduled();
      return new Response(null, { status: 204 });
    }
    if (url.pathname.startsWith('/_test-media/')) {
      const key = url.pathname.slice('/_test-media/'.length);
      if (request.method === 'PUT' && request.headers.get('authorization') === `Bearer ${example.secret}` && request.body) {
        await env.AUDIO.put(key, request.body);
        return new Response(null, { status: 204 });
      }
      if (request.method !== 'GET' || url.searchParams.get('ticket') !== 'local-only') {
        return new Response(null, { status: 403 });
      }
      const object = await env.AUDIO.get(key);
      return object ? new Response(object.body) : new Response(null, { status: 404 });
    }
    return await service.fetch(request) ?? new Response(null, { status: 404 });
  },
};
