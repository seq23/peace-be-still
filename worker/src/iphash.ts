// "IP addresses are stored only as one-way hashes" (privacy policy). A plain SHA of an IPv4
// address is reversible (2^32 inputs), so the hash is keyed: HMAC-SHA256(IP_HASH_SECRET, day|ip).
// IPv6 is cut to its /64 first: one home or phone holds a whole /64, so hashing the full
// address would give one person 2^64 "IPs" and make the per-IP limit meaningless.
const encoder = new TextEncoder();

export function ipPrefix(ip: string): string {
  if (!ip.includes(':')) return ip.trim();
  let [head, tail = ''] = ip.toLowerCase().split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const groups = ip.includes('::') ? [...left, ...Array(8 - left.length - right.length).fill('0'), ...right] : left;
  return groups.slice(0, 4).map(g => (parseInt(g || '0', 16) || 0).toString(16)).join(':') + '::/64';
}

export async function ipHash(secret: string | undefined, day: string, ip: string): Promise<string> {
  return keyedHash(secret, `${day}|${ipPrefix(ip)}`);
}

/** HMAC-SHA256(IP_HASH_SECRET, text), first 16 bytes as hex: one-way, and useless without the secret. */
export async function keyedHash(secret: string | undefined, text: string): Promise<string> {
  if (!secret || encoder.encode(secret).length < 32) throw new Error('IP_HASH_SECRET_MISSING');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(text)));
  return [...mac.slice(0, 16)].map(b => b.toString(16).padStart(2, '0')).join('');
}
