// A new install's very first chat runs on the private paid route (her ruling 21 Nov 2026): one
// conversation, up to the free day's FREE_CHAT_MESSAGES. Every later free chat is the normal free lane.
//
// The Worker decides, once per install (POST /api/chat/first), and never trusts the app's word:
//  - once per DEVICE: Apple DeviceCheck's bit0 ("this device already had its private first chat"),
//    which survives a reinstall or a cleared install id. No DeviceCheck token (web, Android), or
//    DeviceCheck down or unset (DEVICECHECK_KEY_MISSING): the normal free lane. Fail closed, never
//    private-for-everyone.
//  - at most FIRST_PRIVATE_PER_IP a day from one network, FIRST_PRIVATE_PER_DAY app-wide, and none
//    past the paid route's monthly cap.
// The row is also the install's cohort (granted 1/0) for the paid-conversion comparison.
import { logCode } from './counts';

export const FIRST_PRIVATE_KEEP_DAYS = 120;
export const FIRST_PRIVATE_PER_IP = 3;

export type FirstRow = { conversation: string | null; granted: number; reason: string; day: string; messages: number; ended_at: number | null };
export type DeviceBit = 'new' | 'used' | 'error';

export const firstRow = (db: D1Database, installId: string) =>
  db.prepare('SELECT conversation, granted, reason, day, messages, ended_at FROM chat_first_private WHERE install_id = ?').bind(installId).first<FirstRow>();

/** The private first chat is on for this conversation today. */
export const firstActive = (row: FirstRow | null, conversation: string, day: string) =>
  !!row && row.granted === 1 && row.ended_at === null && row.day === day && row.conversation === conversation;

/** The private first chat stops (the paid route failed, or the monthly cap): the next message waits for her free-chat yes. */
export const endFirst = (db: D1Database, installId: string, reason: string, now: number) =>
  db.prepare('UPDATE chat_first_private SET ended_at = ?, ended_reason = ? WHERE install_id = ? AND ended_at IS NULL').bind(now, reason, installId).run();

export const countFirstMessage = (db: D1Database, installId: string) =>
  db.prepare('UPDATE chat_first_private SET messages = messages + 1 WHERE install_id = ?').bind(installId).run();

export type Decide = {
  db: D1Database; installId: string; conversation: string; ipHash: string; day: string; now: number;
  deviceToken: string | null; perDay: number; pastCap: boolean;
  deviceCheck: (token: string) => Promise<DeviceBit>;
};

/** Whether this install's chat `conversation` is its private first chat. Decided once; later calls read the row. */
export async function decideFirst(a: Decide): Promise<{ private: boolean; reason: string }> {
  const row = await firstRow(a.db, a.installId);
  if (row) {
    if (firstActive(row, a.conversation, a.day)) return { private: true, reason: row.reason };
    // The app opened a new conversation before sending anything (the Chat tab remounted): the same first chat.
    if (row.granted === 1 && row.ended_at === null && row.day === a.day && row.messages === 0) {
      await a.db.prepare('UPDATE chat_first_private SET conversation = ? WHERE install_id = ? AND messages = 0').bind(a.conversation, a.installId).run();
      return { private: true, reason: row.reason };
    }
    return { private: false, reason: row.granted === 1 ? 'used' : row.reason };
  }
  const deny = async (reason: string) => {
    await a.db.prepare('INSERT OR IGNORE INTO chat_first_private (install_id, conversation, granted, reason, ip_hash, day, decided_at) VALUES (?, ?, 0, ?, ?, ?, ?)')
      .bind(a.installId, a.conversation, reason, a.ipHash, a.day, a.now).run();
    return { private: false, reason };
  };
  if (!a.deviceToken) return deny('no_devicecheck');
  if (a.pastCap) return deny('cap');
  // One statement, so two first chats at once cannot both pass a cap: the row is held as granted
  // while DeviceCheck answers, and released (granted 0) if the device already had one.
  const held = await a.db.prepare(`INSERT OR IGNORE INTO chat_first_private (install_id, conversation, granted, reason, ip_hash, day, decided_at)
    SELECT ?1, ?2, 1, 'pending', ?3, ?4, ?5
    WHERE (SELECT COUNT(*) FROM chat_first_private WHERE day = ?4 AND granted = 1 AND ip_hash = ?3) < ?6
      AND (SELECT COUNT(*) FROM chat_first_private WHERE day = ?4 AND granted = 1) < ?7`)
    .bind(a.installId, a.conversation, a.ipHash, a.day, a.now, FIRST_PRIVATE_PER_IP, a.perDay).run();
  if (!held.meta.changes) {
    if (await firstRow(a.db, a.installId)) return decideFirst(a); // a second call of the same install won the race
    const ipFull = ((await a.db.prepare('SELECT COUNT(*) AS n FROM chat_first_private WHERE day = ? AND granted = 1 AND ip_hash = ?').bind(a.day, a.ipHash).first<{ n: number }>())?.n ?? 0) >= FIRST_PRIVATE_PER_IP;
    return deny(ipFull ? 'ip_cap' : 'global_cap');
  }
  const bit = await a.deviceCheck(a.deviceToken).catch((): DeviceBit => 'error');
  const reason = bit === 'new' ? 'devicecheck' : bit === 'used' ? 'device_used' : 'devicecheck_error';
  await a.db.prepare('UPDATE chat_first_private SET granted = ?, reason = ? WHERE install_id = ?').bind(bit === 'new' ? 1 : 0, reason, a.installId).run();
  return { private: bit === 'new', reason };
}

// Apple DeviceCheck (developer.apple.com/documentation/devicecheck): two bits per device, kept by Apple
// for this developer team, readable and settable with an ES256 key. bit0 = "had its private first chat".
type DeviceCheckEnv = { APPLE_DEVICECHECK_KEY?: string; APPLE_DEVICECHECK_KEY_ID?: string; APPLE_TEAM_ID?: string; DEVICECHECK_HOST?: string };

const b64url = (bytes: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function appleJwt(env: Required<Pick<DeviceCheckEnv, 'APPLE_DEVICECHECK_KEY' | 'APPLE_DEVICECHECK_KEY_ID' | 'APPLE_TEAM_ID'>>, now: number): Promise<string> {
  const pem = env.APPLE_DEVICECHECK_KEY.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), c => c.charCodeAt(0)), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const enc = new TextEncoder();
  const head = `${b64url(enc.encode(JSON.stringify({ alg: 'ES256', kid: env.APPLE_DEVICECHECK_KEY_ID })))}.${b64url(enc.encode(JSON.stringify({ iss: env.APPLE_TEAM_ID, iat: Math.floor(now / 1000) })))}`;
  // WebCrypto's ECDSA signature is r||s, the form a JWS wants.
  return `${head}.${b64url(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(head)))}`;
}

/** The device's bit0: 'new' (unset, now set), 'used' (already set), or 'error' (no key, Apple down, a refused token). */
export async function appleDeviceCheck(env: DeviceCheckEnv, token: string, now: number, fetcher: typeof fetch = fetch): Promise<DeviceBit> {
  if (!env.APPLE_DEVICECHECK_KEY || !env.APPLE_DEVICECHECK_KEY_ID || !env.APPLE_TEAM_ID) { logCode('DEVICECHECK_KEY_MISSING'); return 'error'; }
  const host = env.DEVICECHECK_HOST || 'https://api.devicecheck.apple.com';
  try {
    const auth = `Bearer ${await appleJwt(env as Required<DeviceCheckEnv>, now)}`;
    const post = (path: string, body: Record<string, unknown>) => fetcher(`${host}/v1/${path}`, {
      method: 'POST', headers: { authorization: auth, 'content-type': 'application/json' },
      body: JSON.stringify({ device_token: token, transaction_id: crypto.randomUUID(), timestamp: now, ...body }), signal: AbortSignal.timeout(4000),
    });
    const q = await post('query_two_bits', {});
    if (q.status !== 200) { logCode('DEVICECHECK_QUERY_FAILED', { status: q.status }); return 'error'; }
    // 200 with "Failed to find bit state" is a device Apple has never seen: both bits unset.
    const text = await q.text();
    const bits = text.trim().startsWith('{') ? (JSON.parse(text) as { bit0?: boolean; bit1?: boolean }) : {};
    if (bits.bit0 === true) return 'used';
    const u = await post('update_two_bits', { bit0: true, bit1: bits.bit1 === true });
    if (u.status !== 200) { logCode('DEVICECHECK_UPDATE_FAILED', { status: u.status }); return 'error'; }
    return 'new';
  } catch (error) {
    logCode('DEVICECHECK_FAILED', { error: String(error).slice(0, 80) });
    return 'error';
  }
}
