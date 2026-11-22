// Rule 0 for the Play upload: proves the build reached Google Play, as a DRAFT on the internal track only.
// Reads the tracks through the Android Publisher API with the upload service account, in a throwaway edit
// (opened, read, deleted; nothing is committed). Exit 0 only if versionCode <code> is a draft release on
// `internal` and on no other track.
// Usage: node scripts/android/play-track.mjs <service-account.json> <package> <versionCode>
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

export function trackIssues(tracks, versionCode) {
  const v = String(versionCode);
  const holding = tracks.flatMap(t => (t.releases ?? []).filter(r => (r.versionCodes ?? []).map(String).includes(v)).map(r => ({ track: t.track, status: r.status })));
  const issues = [];
  if (!holding.some(h => h.track === 'internal' && h.status === 'draft')) issues.push(`PLAY_TRACK_MISSING: versionCode ${v} is not a draft on the internal track`);
  for (const h of holding.filter(h => h.track !== 'internal' || h.status !== 'draft')) issues.push(`PLAY_TRACK_WRONG: versionCode ${v} is ${h.status} on ${h.track}`);
  return issues;
}

async function accessToken(sa) {
  const b64 = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: sa.token_uri, iat: now, exp: now + 600 })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key).toString('base64url');
  const res = await fetch(sa.token_uri, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }) });
  if (!res.ok) throw new Error(`PLAY_AUTH_FAILED: token endpoint answered ${res.status}`);
  return (await res.json()).access_token;
}

async function main([keyFile, pkg, versionCode]) {
  if (!keyFile || !pkg || !/^\d+$/.test(versionCode ?? '')) throw new Error('usage: play-track.mjs <service-account.json> <package> <versionCode>');
  const sa = JSON.parse(readFileSync(keyFile, 'utf8'));
  const token = await accessToken(sa);
  const api = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${pkg}/edits`;
  const call = async (path, method = 'GET') => {
    const res = await fetch(`${api}${path}`, { method, headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`PLAY_API_FAILED: ${method} edits${path.replace(/\/[^/]+/, '/{edit}')} answered ${res.status}`);
    return method === 'DELETE' ? null : res.json();
  };
  const edit = await call('', 'POST');
  try {
    const { tracks = [] } = await call(`/${edit.id}/tracks`);
    const issues = trackIssues(tracks, versionCode);
    for (const t of tracks) for (const r of t.releases ?? []) console.log(`track ${t.track}: ${r.status} ${(r.versionCodes ?? []).join(',') || '-'}`);
    if (issues.length) throw new Error(issues.join('; '));
    console.log(`OUTPUT play: versionCode ${versionCode} of ${pkg} is a draft on the internal track, on no other track`);
  } finally {
    await call(`/${edit.id}`, 'DELETE').catch(() => {});
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch(error => { console.error(String(error.message ?? error)); process.exit(1); });
}
