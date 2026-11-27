// Test preload (worker/test/free-ai.unit.mjs): every fetch a script tries is written to NET_LOG and fails,
// so a test can prove a refused run made zero network calls.
import { appendFileSync } from 'node:fs';
globalThis.fetch = async (url) => { appendFileSync(process.env.NET_LOG, `${String(url).replace(/accounts\/[^/]+/, 'accounts/<id>')}\n`); throw new Error('network is off in this test'); };
