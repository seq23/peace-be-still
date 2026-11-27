// The app's side of chat: the install token, sending a message, reporting an answer and deleting chat memory.
// The base URL is ONE config value. Under 13 nothing here is ever called (buildChatRequest is null,
// and the Chat tab is hidden), so no install id is made for a child.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Age, Settings } from '../model';
import { buildChatRequest, type ChatResponse, type ChatTurn } from './contract';
import { deviceCheckToken } from './devicecheck';

export const CHAT_API = process.env.EXPO_PUBLIC_CHAT_API ?? 'https://peacebestillapp.com/api';
const TOKEN_KEY = 'peace-be-still-chat-token';
export const DISCLOSURE_KEY = 'peace-be-still-chat-disclosure';

export class ChatError extends Error {}

type Saved = { token: string; age: Age; installId?: string };
const saved = async () => JSON.parse((await AsyncStorage.getItem(TOKEN_KEY)) ?? 'null') as Saved | null;

/** Her token. After 30 days it is RENEWED for the same install id (her RevenueCat id and her memory
 *  key), never replaced by a new id; a new id is made only for a first chat or a new age band. */
const tokenRequests = new Map<Age, Promise<string>>();

function token(age: Age, fetcher: typeof fetch, refresh = false): Promise<string> {
  const pending = tokenRequests.get(age);
  if (pending) return pending;
  const request = fetchToken(age, fetcher, refresh).finally(() => tokenRequests.delete(age));
  tokenRequests.set(age, request);
  return request;
}

async function fetchToken(age: Age, fetcher: typeof fetch, refresh: boolean): Promise<string> {
  const old = await saved();
  if (old?.token && old.age === age) {
    if (!refresh && old.installId) return old.token;
    const res = await fetcher(`${CHAT_API}/token/renew`, { method: 'POST', headers: { authorization: `Bearer ${old.token}` } });
    if (res.ok) {
      const { token: value, installId } = (await res.json()) as { token: string; installId: string };
      await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify({ token: value, age, installId }));
      return value;
    }
    if (res.status !== 401) throw new ChatError(res.status === 429 ? 'slow' : `renew ${res.status}`);
  }
  const res = await fetcher(`${CHAT_API}/token`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ age }) });
  if (res.status === 429) {
    const r = (await res.json().catch(() => null)) as { kind?: string } | null;
    throw new ChatError(r?.kind === 'network_limit' ? 'network' : 'slow');
  }
  if (!res.ok) throw new ChatError(`token ${res.status}`);
  const { token: value, installId } = (await res.json()) as { token: string; installId: string };
  await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify({ token: value, age, installId }));
  return value;
}

/** freeConsent: she said yes on the free-chat screen (free chat goes to a free AI service that may keep it).
 *  overflowConsent: a paid user said yes, today, to free chat (not private) after her private messages. */
export async function sendChat(settings: Settings, conversation: string, messages: ChatTurn[], fetcher: typeof fetch = fetch, freeConsent = false, region: string | null = null, overflowConsent = false): Promise<ChatResponse> {
  const body = buildChatRequest(settings, conversation, messages, freeConsent, region, overflowConsent);
  if (!body || !settings.age) throw new ChatError('chat closed');
  for (const refresh of [false, true]) {
    const res = await fetcher(`${CHAT_API}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${await token(settings.age, fetcher, refresh)}` },
      body: JSON.stringify(body),
    });
    if (res.status === 401 && !refresh) continue; // expired: renew once, same install id
    if (res.status === 429) { const r = (await res.json().catch(() => null)) as Partial<ChatResponse> | null; if (r?.kind === 'limit') throw new ChatError('slow'); }
    if (!res.ok) throw new ChatError(`chat ${res.status}`);
    return (await res.json()) as ChatResponse;
  }
  throw new ChatError('unauthorized');
}

/** A signed POST to another Worker route with her install token (Write your own night), renewed once on a 401
 *  for the same install id. Throws on a network failure; the caller reads the status. */
export async function authorizedPost(age: Age, path: string, body: unknown, fetcher: typeof fetch = fetch): Promise<Response> {
  if (age === 'child') throw new ChatError('closed');
  for (const refresh of [false, true]) {
    const res = await fetcher(`${CHAT_API}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${await token(age, fetcher, refresh)}` },
      body: JSON.stringify(body),
    });
    if (res.status === 401 && !refresh) continue;
    return res;
  }
  throw new ChatError('unauthorized');
}

/** Whether this conversation is the install's private first chat. The Worker decides (Apple DeviceCheck,
 *  per-network and daily caps); any failure or slowness is "no": the normal free chat, with its consent. */
export async function askFirstPrivate(settings: Settings, conversation: string, fetcher: typeof fetch = fetch, waitMs = 6000): Promise<boolean> {
  if (settings.age !== 'adult' && settings.age !== 'teen') return false;
  const age = settings.age;
  const ask = (async () => {
    const deviceCheck = await deviceCheckToken();
    const res = await fetcher(`${CHAT_API}/chat/first`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${await token(age, fetcher)}` },
      body: JSON.stringify({ conversation, ...(deviceCheck ? { deviceCheck } : {}) }),
    });
    return res.ok && ((await res.json()) as { private?: unknown }).private === true;
  })();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<boolean>(done => { timer = setTimeout(() => done(false), waitMs); });
  try { return await Promise.race([ask.catch(() => false), late]); } finally { clearTimeout(timer); }
}

export type ReportReason = 'hurtful' | 'wrong' | 'unsafe' | 'other';
/** "Report this answer": sends the answer she saw and the reason she picked, never her message. */
export async function reportAnswer(answer: string, reason: ReportReason, fetcher: typeof fetch = fetch): Promise<void> {
  const old = await saved();
  if (!old?.token) throw new ChatError('no token'); // an answer on screen means she has one
  const res = await fetcher(`${CHAT_API}/report`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${old.token}` }, body: JSON.stringify({ answer, reason }) });
  if (res.status !== 200) throw new ChatError(`report ${res.status}`);
}

/** Resolves only when the server confirmed the delete (200), or when she never chatted (nothing stored).
 *  The server accepts an expired token here, so a 401 is a real failure and is shown as one. */
/** Settings, "What the chat remembers": her own note, read with her signed token (the server never takes an id
 *  from the request). No token means she never chatted, so nothing is stored. An old token is renewed for the
 *  SAME install id, never swapped for a new one (a new id would read someone new's empty note and show "nothing").
 *  Anything but a clear answer throws, so the screen says it couldn't load, never "nothing remembered". */
export async function readChatMemory(fetcher: typeof fetch = fetch): Promise<{ summary: string | null }> {
  const old = await saved();
  if (!old?.token) return { summary: null };
  const read = (value: string) => fetcher(`${CHAT_API}/memory`, { headers: { authorization: `Bearer ${value}` } });
  let res = await read(old.token);
  if (res.status === 401) {
    const renew = await fetcher(`${CHAT_API}/token/renew`, { method: 'POST', headers: { authorization: `Bearer ${old.token}` } });
    if (!renew.ok) throw new ChatError(`renew ${renew.status}`);
    const { token: value, installId } = (await renew.json()) as { token: string; installId: string };
    await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify({ token: value, age: old.age, installId }));
    res = await read(value);
  }
  if (res.status !== 200) throw new ChatError(`memory ${res.status}`);
  const body = (await res.json().catch(() => null)) as { summary?: unknown } | null;
  if (!body || !('summary' in body) || (body.summary !== null && typeof body.summary !== 'string')) throw new ChatError('memory unreadable');
  return { summary: body.summary || null };
}

export async function deleteChatMemory(fetcher: typeof fetch = fetch): Promise<void> {
  const old = await saved();
  if (!old?.token) return; // never chatted: nothing is stored
  const res = await fetcher(`${CHAT_API}/memory`, { method: 'DELETE', headers: { authorization: `Bearer ${old.token}` } });
  if (res.status !== 200) throw new ChatError(`memory ${res.status}`);
  const body = (await res.json().catch(() => null)) as { deleted?: boolean } | null;
  if (body?.deleted !== true) throw new ChatError('memory not confirmed');
}

/** Checkout and chat use the same server-issued identity, including when checkout comes first. */
export async function installId(age?: Age): Promise<string | null> {
  const existing = await saved();
  if (!age || age === 'child') return existing?.installId ?? null;
  if (existing?.age === age && existing.installId) return existing.installId;
  await token(age, fetch);
  return (await saved())?.installId ?? null;
}

/** Store review access (worker/src/review.ts): true only while a store review window is open on the server. */
export async function reviewOpen(fetcher: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await fetcher(`${CHAT_API}/review`);
    return res.status === 200 && ((await res.json()) as { open?: unknown }).open === true;
  } catch {
    return false;
  }
}

export type ReviewResult = 'granted' | 'wrong' | 'usedUp' | 'slow' | 'failed';
/** Sends a store reviewer's code for this install. The server asks RevenueCat to grant the paid plan; this only
 *  reports what the server said. Any failure, including no answer, is 'failed' (never paid). */
export async function redeemReviewCode(age: Age, code: string, fetcher: typeof fetch = fetch): Promise<ReviewResult> {
  try {
    for (const refresh of [false, true]) {
      const res = await fetcher(`${CHAT_API}/review/unlock`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${await token(age, fetcher, refresh)}` },
        body: JSON.stringify({ code }),
      });
      if (res.status === 401 && !refresh) continue;
      if (res.status === 200) return 'granted';
      if (res.status === 403) return ((await res.json().catch(() => null)) as { error?: string } | null)?.error === 'USED_UP' ? 'usedUp' : 'wrong';
      if (res.status === 429) return 'slow';
      return 'failed';
    }
  } catch { /* offline or the server is down */ }
  return 'failed';
}
