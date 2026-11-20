// Install tokens identify an anonymous device; they do not grant a paid entitlement.
const encoder = new TextEncoder();
const base64url = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
const decode = value => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

async function keyFor(secret) {
  if (typeof secret !== 'string' || encoder.encode(secret).length < 32) throw new Error('CHAT_TOKEN_SECRET_MISSING');
  return crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function issueInstallToken(installId, secret, now = Date.now()) {
  if (!/^[a-f0-9-]{36}$/i.test(installId)) throw new Error('INVALID_INSTALL_ID');
  const payload = base64url(encoder.encode(JSON.stringify({ installId, exp: Math.floor(now / 1000) + 30 * 86400 })));
  const signature = await crypto.subtle.sign('HMAC', await keyFor(secret), encoder.encode(payload));
  return `${payload}.${base64url(new Uint8Array(signature))}`;
}

export async function verifyInstallToken(token, secret, now = Date.now()) {
  try {
    const parts = token.split('.');
    if (parts.length !== 2 || parts.some(part => !/^[A-Za-z0-9_-]+$/.test(part))) return null;
    if (!await crypto.subtle.verify('HMAC', await keyFor(secret), decode(parts[1]), encoder.encode(parts[0]))) return null;
    const payload = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    if (!/^[a-f0-9-]{36}$/i.test(payload.installId) || !Number.isSafeInteger(payload.exp) || payload.exp <= Math.floor(now / 1000)) return null;
    return payload.installId;
  } catch { return null; }
}
