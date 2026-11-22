// Temporary: downloads the Play-signed universal APK Google generated for one internal-track versionCode.
import { createSign } from 'node:crypto';
import { statSync, writeFileSync } from 'node:fs';
const [vc, out] = process.argv.slice(2);
const sa = JSON.parse(process.env.PLAY_SA);
const now = Math.floor(Date.now() / 1000);
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
const body = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/androidpublisher', aud: sa.token_uri, iat: now, exp: now + 3600 })}`;
const jwt = `${body}.${createSign('RSA-SHA256').update(body).sign(sa.private_key, 'base64url')}`;
const tok = await (await fetch(sa.token_uri, { method: 'POST', body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }) })).json();
if (!tok.access_token) { console.log('NAMED STOP PLAY_TOKEN_REFUSED'); process.exit(3); }
const base = 'https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.peacebestillapp.mobile/generatedApks';
const h = { authorization: `Bearer ${tok.access_token}` };
let id;
for (let i = 0; i < 20 && !id; i++) {
  const j = await (await fetch(`${base}/${vc}`, { headers: h })).json();
  id = j.generatedApks?.[0]?.generatedUniversalApk?.downloadId;
  if (!id) await new Promise(r => setTimeout(r, 30000));
}
if (!id) { console.log(`NAMED STOP NO_UNIVERSAL_APK for versionCode ${vc}`); process.exit(3); }
const r = await fetch(`${base}/${vc}/downloads/${encodeURIComponent(id)}:download?alt=media`, { headers: h });
if (!r.ok) { console.log(`NAMED STOP APK_DOWNLOAD_${r.status}`); process.exit(3); }
writeFileSync(out, Buffer.from(await r.arrayBuffer()));
console.log(`OUTPUT universal APK for versionCode ${vc}: ${statSync(out).size} bytes`);
