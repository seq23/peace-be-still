import type { Language } from '../i18n';
import type { Age, Door } from '../model';
import { madeForYouToken } from './paidStub';

export type Kind = 'psalm' | 'imagination';
type Receipt = { id: string; day: string };
/** dueAt: the time she was promised (epoch ms, 08:00 Central of the night it is made in). */
export type Pending = Receipt & { dueAt: number; late: boolean; retrying: boolean };
export type Ready = Receipt & { seconds: number; sha256: string };
export type Shelf = {
  ready: Ready[];
  pending: Pending | null;
  /** Her latest request ended without audio: stopped after three tries, or expired the morning after its promise. Her note is gone. */
  ended: 'stopped' | 'expired' | null;
  /** One request a Central day, of any kind. */
  requestedToday: boolean;
  /** What a request sent now would be promised; null when tonight and tomorrow night are full. */
  next: number | null;
};
export type Submission = ({ status: 'pending'; dueAt: number } & Receipt) | { status: 'crisis'; kind: string; text: string } | { status: 'preview' };
/** lang is the voiced library's language (i18n contentLanguage): sessions are made in English or Spanish. */
/** shown is the screen language: a crisis reply is written in it (a Korean phone's sessions are English). */
export type SessionContext = { age: Age; door: Door; lang: 'en' | 'es'; kind: Kind; shown?: Language };
/** The chat's report reasons (one report path, POST /api/report). */
export type ReportReason = 'hurtful' | 'wrong' | 'unsafe' | 'other';

export class SessionError extends Error {
  constructor(readonly code: string) { super(code); }
}

const base = () => process.env.EXPO_PUBLIC_CHAT_API ?? 'https://peacebestillapp.com/api';

export const madeForYouApi = {
  list: (context: SessionContext, signal?: AbortSignal) => request<Shelf>(context, { signal }),
  submit: (context: SessionContext, text: string) => request<Submission>(context, {
    method: 'POST', body: JSON.stringify({ kind: context.kind, lang: context.lang, door: context.door, text, ...(context.shown ? { shown: context.shown } : {}) }),
  }),
  play: (context: SessionContext, id: string, signal?: AbortSignal) => request<{ url: string }>(context, { signal }, { play: id }),
  /** One session, or every session she has when no id is given. */
  remove: (context: Pick<SessionContext, 'age'>, id?: string) =>
    call<{ deleted: number }>(context.age, `/made-for-you${id ? `?id=${encodeURIComponent(id)}` : ''}`, { method: 'DELETE' }),
  report: (context: Pick<SessionContext, 'age'>, id: string, reason: ReportReason) =>
    call<{ reported: true }>(context.age, '/report', { method: 'POST', body: JSON.stringify({ session: id, reason }) }),
};

function request<T>({ age, kind, lang }: SessionContext, init: RequestInit, extra: Record<string, string> = {}): Promise<T> {
  return call<T>(age, `/made-for-you?${new URLSearchParams({ kind, lang, ...extra })}`, init);
}

async function call<T>(age: Age, path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${base()}${path}`, {
    ...init, headers: { 'content-type': 'application/json', authorization: `Bearer ${await madeForYouToken(age)}` },
  });
  const result = await response.json();
  if (!response.ok) throw new SessionError(result.error ?? 'UNAVAILABLE');
  return result as T;
}
