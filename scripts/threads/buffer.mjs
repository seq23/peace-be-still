// Buffer GraphQL client for the Peace Be Still Threads job (scripts/threads/threads_loop.mjs).
// The same calls as approvalprep scripts/brand_social/buffer_queue.mjs (copied, not shared: the
// repos do not share code). The token is ApprovalPrep's own free Buffer, which also holds the
// Threads @peacebestillapp channel.
export const API = 'https://api.buffer.com';
export const TOKEN_ENV = 'BUFFER_APPROVALPREP_ACCESS_TOKEN';

export class NamedStop extends Error {
  constructor(code, why) { super(`${code} - ${why}`); this.code = code; }
}

export function bufferClient(token, fetchImpl = fetch, tokenEnv = TOKEN_ENV) {
  return async function call(query, variables = {}) {
    let res;
    try {
      res = await fetchImpl(API, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ query, variables }) });
    } catch (e) {
      throw new NamedStop('BUFFER_READ_FAILED', `api.buffer.com unreachable: ${e.message}`);
    }
    if (res.status === 401 || res.status === 403) throw new NamedStop('BUFFER_TOKEN_REFUSED', `api.buffer.com answered ${res.status}: mint a new token in Buffer and save it as ${tokenEnv}`);
    const body = await res.json().catch(() => null);
    if (!res.ok || !body || body.errors?.length) throw new NamedStop('BUFFER_READ_FAILED', `api.buffer.com ${res.status}: ${JSON.stringify(body?.errors ?? body).slice(0, 300)}`);
    return body.data;
  };
}

export const PENDING_STATUSES = ['scheduled', 'sending', 'needs_approval'];

/** Every post still waiting to go out in the organisation (every channel, so the org limit is respected). */
export async function pendingPosts(call, orgId, fields = 'id channelId') {
  // One status per query: Buffer answers a multi-status filter with nothing (18 Nov 2026).
  const out = [];
  for (const status of PENDING_STATUSES) {
    const { posts } = await call(`query($o:OrganizationId!){ posts(first:100, input:{organizationId:$o, filter:{status:[${status}]}}){ edges { node { ${fields} } } } }`, { o: orgId });
    out.push(...(posts?.edges ?? []).map((e) => e.node));
  }
  return out;
}

export async function createPost(call, input) {
  const data = await call(`mutation($i:CreatePostInput!){ createPost(input:$i){ __typename ... on PostActionSuccess { post { id dueAt } } ... on MutationError { message } } }`, { i: input });
  const r = data?.createPost;
  if (!r || r.__typename !== 'PostActionSuccess') throw new NamedStop('BUFFER_POST_REFUSED', `${input.channelId}: ${r?.message ?? JSON.stringify(r).slice(0, 200)}`);
  return r.post;
}
