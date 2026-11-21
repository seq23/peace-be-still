// The install token: an anonymous install id made on the server, the age band it was issued
// for, and a key id. It grants no paid status (RevenueCat decides that, see entitlement.ts).
// Rotation: set CHAT_TOKEN_SECRET_PREVIOUS to the old secret and CHAT_TOKEN_KID to a new id
// (k1 -> k2), put the new CHAT_TOKEN_SECRET, deploy. Old tokens verify against the previous key
// until they expire (30 days); then remove CHAT_TOKEN_SECRET_PREVIOUS.
// Renewal: the install id is her RevenueCat app user id and her memory key, so it must never
// change. A token past its 30 days, with a valid signature, is re-signed for the SAME install id
// (POST /api/token/renew, up to a year after expiry); only a forged or unknown token gets nothing.
export type AgeBand = 'teen' | 'adult';
export type Install = { installId: string; age: AgeBand };
type Payload = { v: 1; kid: string; iid: string; age: AgeBand; exp: number };

const encoder = new TextEncoder();
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
const unb64url = (value: string) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
export const TOKEN_DAYS = 30;

async function key(secret: string | undefined): Promise<CryptoKey> {
  if (!secret || encoder.encode(secret).length < 32) throw new Error('CHAT_TOKEN_SECRET_MISSING');
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export type TokenKeys = { kid: string; secret: string | undefined; previous?: string | undefined };

export const RENEW_GRACE_DAYS = 365;

export async function issueToken(keys: TokenKeys, age: AgeBand, now: number, installId: string = crypto.randomUUID()): Promise<{ token: string; installId: string }> {
  const payload: Payload = { v: 1, kid: keys.kid, iid: installId, age, exp: Math.floor(now / 1000) + TOKEN_DAYS * 86400 };
  const body = b64url(encoder.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await key(keys.secret), encoder.encode(body)));
  return { token: `${body}.${b64url(sig)}`, installId };
}

/** Null for anything forged, expired, malformed or signed with an unknown key. Constant-time verify.
 *  `graceDays` accepts a token that expired up to that many days ago (renewal and memory delete only). */
export async function verifyToken(keys: TokenKeys, token: string | null, now: number, graceDays = 0): Promise<Install | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts.every(p => /^[A-Za-z0-9_-]{10,}$/.test(p))) return null;
  let payload: Payload;
  try { payload = JSON.parse(new TextDecoder().decode(unb64url(parts[0]))) as Payload; } catch { return null; }
  const secret = payload.kid === keys.kid ? keys.secret : keys.previous;
  if (!secret) return null;
  const ok = await crypto.subtle.verify('HMAC', await key(secret), unb64url(parts[1]), encoder.encode(parts[0]));
  if (!ok || payload.v !== 1 || !/^[0-9a-f-]{36}$/.test(payload.iid) || (payload.age !== 'teen' && payload.age !== 'adult')) return null;
  if (!Number.isSafeInteger(payload.exp) || payload.exp + graceDays * 86400 <= Math.floor(now / 1000)) return null;
  return { installId: payload.iid, age: payload.age };
}
