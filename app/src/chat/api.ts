// The app's side of chat: the install token, sending a message and deleting chat memory.
// The base URL is ONE config value. Under 13 nothing here is ever called (buildChatRequest is null,
// and the Chat tab is hidden), so no install id is made for a child.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Age, Settings } from '../model';
import { buildChatRequest, type ChatResponse, type ChatTurn } from './contract';

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

export async function sendChat(settings: Settings, conversation: string, messages: ChatTurn[], fetcher: typeof fetch = fetch): Promise<ChatResponse> {
  const body = buildChatRequest(settings, conversation, messages);
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

/** Resolves only when the server confirmed the delete (200), or when she never chatted (nothing stored).
 *  The server accepts an expired token here, so a 401 is a real failure and is shown as one. */
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
