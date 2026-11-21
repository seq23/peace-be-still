// Deploy-time check of the Apple DeviceCheck key (the private first chat, worker/src/firstprivate.ts).
// Signs the same ES256 token the Worker signs and sends Apple a dummy device token:
//   400 = Apple accepted the key and refused the dummy token: the key works.
//   401 = Apple refused the key: NAMED STOP DEVICECHECK_KEY_REJECTED (exit 3), nothing is deployed.
// Reads APPLE_DEVICECHECK_KEY, APPLE_DEVICECHECK_KEY_ID and APPLE_TEAM_ID_PBS from the environment
// (the Boss OS vault's `vault:run`); never prints them.
import { webcrypto as crypto } from 'node:crypto';

const { APPLE_DEVICECHECK_KEY: pemKey, APPLE_DEVICECHECK_KEY_ID: kid, APPLE_TEAM_ID_PBS: team } = process.env;
if (!pemKey || !kid || !team) { console.log('NAMED STOP DEVICECHECK_KEY_MISSING: run the deploy under the vault (cd ~/GitHub/boss-os && npm run -s vault:run -- bash <repo>/scripts/worker-deploy.sh)'); process.exit(3); }
const b64url = bytes => Buffer.from(bytes).toString('base64url');
const der = Buffer.from(pemKey.replace(/-----[^-]+-----/g, '').replace(/\s+/g, ''), 'base64');
const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
const head = `${b64url(JSON.stringify({ alg: 'ES256', kid }))}.${b64url(JSON.stringify({ iss: team, iat: Math.floor(Date.now() / 1000) }))}`;
const jwt = `${head}.${b64url(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, Buffer.from(head)))}`;
const host = process.env.DEVICECHECK_HOST || 'https://api.devicecheck.apple.com';
const res = await fetch(`${host}/v1/validate_device_token`, {
  method: 'POST', headers: { authorization: `Bearer ${jwt}`, 'content-type': 'application/json' },
  body: JSON.stringify({ device_token: Buffer.from('deploy-check-dummy-token').toString('base64'), transaction_id: crypto.randomUUID(), timestamp: Date.now() }),
  signal: AbortSignal.timeout(10_000),
});
const text = (await res.text()).slice(0, 120).replace(/\s+/g, ' ');
if (res.status === 401 || res.status === 403) { console.log(`NAMED STOP DEVICECHECK_KEY_REJECTED: Apple answered ${res.status} (${text}); check the key, its id and the team id in the vault`); process.exit(3); }
if (res.status !== 400) { console.log(`NAMED STOP DEVICECHECK_PROBE_UNEXPECTED: Apple answered ${res.status} (${text}), not 400 for the dummy token`); process.exit(3); }
console.log(`OUTPUT devicecheck: key accepted (400 for the dummy token: ${text})`);
