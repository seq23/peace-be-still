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

async function token(age: Age, fetcher: typeof fetch, fresh = false): Promise<string> {
  if (!fresh) {
    const saved = JSON.parse((await AsyncStorage.getItem(TOKEN_KEY)) ?? 'null') as { token: string; age: Age } | null;
    if (saved?.token && saved.age === age) return saved.token; // a new age band needs a new token
  }
  const res = await fetcher(`${CHAT_API}/token`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ age }) });
  if (!res.ok) throw new ChatError(`token ${res.status}`);
  const { token: value, installId } = (await res.json()) as { token: string; installId: string };
  // installId is the anonymous id RevenueCat should know her by (phase 5: Purchases.logIn(installId)).
  await AsyncStorage.setItem(TOKEN_KEY, JSON.stringify({ token: value, age, installId }));
  return value;
}

export async function sendChat(settings: Settings, conversation: string, messages: ChatTurn[], fetcher: typeof fetch = fetch): Promise<ChatResponse> {
  const body = buildChatRequest(settings, conversation, messages);
  if (!body || !settings.age) throw new ChatError('chat closed');
  for (const fresh of [false, true]) {
    const res = await fetcher(`${CHAT_API}/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${await token(settings.age, fetcher, fresh)}` },
      body: JSON.stringify(body),
    });
    if (res.status === 401 && !fresh) continue; // expired: get a new token once
    if (res.status === 429) { const r = (await res.json().catch(() => null)) as Partial<ChatResponse> | null; if (r?.kind === 'limit') throw new ChatError('slow'); }
    if (!res.ok) throw new ChatError(`chat ${res.status}`);
    return (await res.json()) as ChatResponse;
  }
  throw new ChatError('unauthorized');
}

export async function deleteChatMemory(fetcher: typeof fetch = fetch): Promise<void> {
  const saved = JSON.parse((await AsyncStorage.getItem(TOKEN_KEY)) ?? 'null') as { token: string } | null;
  if (!saved?.token) return; // never chatted: nothing is stored
  const res = await fetcher(`${CHAT_API}/memory`, { method: 'DELETE', headers: { authorization: `Bearer ${saved.token}` } });
  if (!res.ok && res.status !== 401) throw new ChatError(`memory ${res.status}`);
}

/** The anonymous install id from the server, once she has chatted; phase 5 logs RevenueCat in with it. */
export async function installId(): Promise<string | null> {
  return (JSON.parse((await AsyncStorage.getItem(TOKEN_KEY)) ?? 'null') as { installId?: string } | null)?.installId ?? null;
}
