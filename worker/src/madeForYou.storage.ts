// The private made-for-you bucket. It lives on her second Cloudflare account (the audio account, PR #62),
// so the chat Worker on the main account cannot bind it. Every call is an S3 request to R2 signed
// with AWS Signature V4, using WebCrypto only and no dependency. Playback gets a presigned GET of at most
// one hour; the Worker itself uses HEAD (the publish check), DELETE (her delete, a report, 30 days after
// her plan) and a server-side copy (a report keeps the audio under reports/, with no install id).
// Least privilege: its own R2 token, scoped to the private bucket pbs-made-for-you only (Object Read and
// Write), never the public library's key. Worker secrets (from the Boss OS vault): PBS_MFY_R2_ACCESS_KEY_ID,
// PBS_MFY_R2_SECRET_ACCESS_KEY, PBS_MFY_R2_BUCKET; var: CF2_ACCOUNT_ID. Any missing → named stop
// MADE_FOR_YOU_STORAGE_CONFIG. The Mac uploads with the same token (audio/made_for_you.py).

const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
const sha256 = async (text: string) => hex(await crypto.subtle.digest('SHA-256', encoder.encode(text)));
async function hmac(key: ArrayBuffer | Uint8Array, text: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, encoder.encode(text));
}
/** RFC 3986 encoding, as SigV4 requires (encodeURIComponent leaves !'()* alone). */
const rfc3986 = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
export const EMPTY_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
export const MAX_PRESIGN_SECONDS = 3600;

export type SignInput = {
  method: string; url: string; headers?: Record<string, string>;
  region: string; service: string; accessKeyId: string; secretAccessKey: string; now: number;
  /** Presign (query auth) for this many seconds; omitted = an Authorization header. */
  expires?: number;
};

/** AWS Signature Version 4 (S3 flavour: the path is encoded once, the payload is not signed for presigns). */
export async function signV4(input: SignInput): Promise<{ url: string; headers: Record<string, string> }> {
  const url = new URL(input.url);
  const amzDate = new Date(input.now).toISOString().replace(/[-:]|\.\d{3}/g, '');
  const date = amzDate.slice(0, 8);
  const scope = `${date}/${input.region}/${input.service}/aws4_request`;
  const presign = input.expires !== undefined;
  const headers: Record<string, string> = { host: url.host };
  for (const [name, value] of Object.entries(input.headers ?? {})) headers[name.toLowerCase()] = value.trim().replace(/\s+/g, ' ');
  const payload = presign ? 'UNSIGNED-PAYLOAD' : EMPTY_SHA256;
  if (!presign) Object.assign(headers, { 'x-amz-content-sha256': payload, 'x-amz-date': amzDate });
  const signed = Object.keys(headers).sort();
  const signedHeaders = signed.join(';');
  if (presign) {
    url.searchParams.set('X-Amz-Algorithm', 'AWS4-HMAC-SHA256');
    url.searchParams.set('X-Amz-Credential', `${input.accessKeyId}/${scope}`);
    url.searchParams.set('X-Amz-Date', amzDate);
    url.searchParams.set('X-Amz-Expires', String(input.expires));
    url.searchParams.set('X-Amz-SignedHeaders', signedHeaders);
  }
  const query = [...url.searchParams].map(([k, v]) => [rfc3986(k), rfc3986(v)]).sort(([a, x], [b, y]) => (a < b ? -1 : a > b ? 1 : x < y ? -1 : x > y ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`).join('&');
  const path = url.pathname.split('/').map(segment => rfc3986(decodeURIComponent(segment))).join('/');
  const canonical = [input.method, path, query, signed.map(name => `${name}:${headers[name]}\n`).join(''), signedHeaders, payload].join('\n');
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, await sha256(canonical)].join('\n');
  let key: ArrayBuffer = await hmac(encoder.encode(`AWS4${input.secretAccessKey}`), date);
  for (const part of [input.region, input.service, 'aws4_request']) key = await hmac(key, part);
  const signature = hex(await hmac(key, toSign));
  if (presign) return { url: `${url.origin}${path}?${query}&X-Amz-Signature=${signature}`, headers: {} };
  const { host: _host, ...sent } = headers;
  return {
    url: url.href,
    headers: { ...sent, authorization: `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}` },
  };
}

export class StorageConfigError extends Error {
  readonly code = 'MADE_FOR_YOU_STORAGE_CONFIG';
}

export type PrivateBucketConfig = { accountId?: string; accessKeyId?: string; secretAccessKey?: string; bucket?: string };

/** The four storage calls createMadeForYou needs, against the private bucket on the second account. */
export function r2Private(config: PrivateBucketConfig, now: () => number = Date.now, fetcher: typeof fetch = fetch) {
  const ready = () => {
    const { accountId, accessKeyId, secretAccessKey, bucket } = config;
    if (!accountId || !accessKeyId || !secretAccessKey || !bucket) throw new StorageConfigError('private bucket not configured');
    return { accountId, accessKeyId, secretAccessKey, bucket };
  };
  const objectUrl = (bucket: string, accountId: string, key: string) =>
    `https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key.split('/').map(rfc3986).join('/')}`;
  async function send(method: string, key: string, headers: Record<string, string> = {}) {
    const c = ready();
    const request = await signV4({ method, url: objectUrl(c.bucket, c.accountId, key), headers, region: 'auto', service: 's3',
      accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey, now: now() });
    return fetcher(request.url, { method, headers: request.headers });
  }
  return {
    async playUrl(key: string, seconds = MAX_PRESIGN_SECONDS): Promise<string> {
      const c = ready();
      const signed = await signV4({ method: 'GET', url: objectUrl(c.bucket, c.accountId, key), region: 'auto', service: 's3',
        accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey, now: now(), expires: Math.min(Math.max(1, Math.floor(seconds)), MAX_PRESIGN_SECONDS) });
      return signed.url;
    },
    async hasAudio(key: string): Promise<boolean> {
      const response = await send('HEAD', key);
      if (response.status === 404) return false;
      if (!response.ok) throw new Error(`R2 HEAD ${response.status}`);
      return true;
    },
    async deleteAudio(key: string): Promise<void> {
      const response = await send('DELETE', key);
      if (!response.ok && response.status !== 404) throw new Error(`R2 DELETE ${response.status}`);
    },
    async copyAudio(from: string, to: string): Promise<void> {
      const c = ready();
      const response = await send('PUT', to, { 'x-amz-copy-source': `/${c.bucket}/${from.split('/').map(rfc3986).join('/')}` });
      if (!response.ok) throw new Error(`R2 COPY ${response.status}`);
    },
  };
}
