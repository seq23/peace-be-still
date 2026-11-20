import type { Age, Door, Language } from '../model';
import { madeForYouToken } from './paidStub';

export type Kind = 'psalm' | 'imagination';
type Pending = { id: string; day: string };
export type Ready = Pending & { path: string; seconds: number; sha256: string };
export type Shelf = { ready: Ready[]; pending: Pending | null };
export type Submission = ({ status: 'pending' } & Pending) | { status: 'crisis'; text: string };
export type SessionContext = { age: Age; door: Door; lang: Language; kind: Kind };

export class SessionError extends Error {
  constructor(readonly code: string) { super(code); }
}

export const madeForYouApi = {
  list: (context: SessionContext, signal?: AbortSignal) => request<Shelf>(context, { signal }),
  submit: (context: SessionContext, text: string) => request<Submission>(context, {
    method: 'POST', body: JSON.stringify({ kind: context.kind, lang: context.lang, door: context.door, text }),
  }),
  play: (context: SessionContext, id: string) => request<{ url: string }>(context, {}, id),
};

async function request<T>({ age, kind, lang }: SessionContext, init: RequestInit, play?: string): Promise<T> {
  const base = process.env.EXPO_PUBLIC_CHAT_API ?? 'https://peacebestillapp.com/api';
  const query = new URLSearchParams({ kind, lang });
  if (play) query.set('play', play);
  const response = await fetch(`${base}/made-for-you?${query}`, {
    ...init, headers: { 'content-type': 'application/json', authorization: `Bearer ${await madeForYouToken(age)}` },
  });
  const result = await response.json();
  if (!response.ok) throw new SessionError(result.error ?? 'UNAVAILABLE');
  return result as T;
}
