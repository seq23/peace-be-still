// Behaviour of the social visit counter (scorecard row pbs-social): a person opening a page from a
// tagged Threads/Instagram/Facebook link adds 1 to that day's count; previews, scripts, pictures and
// untagged visits never count; nothing personal is stored; GET /api/social-visits reads the totals.
import test from "node:test";
import assert from "node:assert/strict";
import worker, { visitSource } from "../src/app.js";

function fakeDb() {
  const rows = new Map(); // `${day}|${source}` -> n
  const db = {
    rows,
    writes: [],
    prepare(sql) {
      let args = [];
      const stmt = {
        bind(...a) { args = a; return stmt; },
        async run() {
          assert.match(sql, /^INSERT INTO social_visits \(day, source, n\)/);
          db.writes.push(args);
          const k = `${args[0]}|${args[1]}`; rows.set(k, (rows.get(k) ?? 0) + 1);
          return { meta: { changes: 1 } };
        },
        async all() {
          const sums = {};
          for (const [k, n] of rows) { const [day, source] = k.split("|"); if (day >= args[0]) sums[source] = (sums[source] ?? 0) + n; }
          return { results: Object.entries(sums).map(([source, n]) => ({ source, n })) };
        },
        async first() { return { day: [...rows.keys()].map((k) => k.split("|")[0]).sort()[0] ?? null }; },
      };
      return stmt;
    },
  };
  return db;
}
const PHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Instagram 350.0";
const req = (path, headers = {}, method = "GET") => new Request(`https://peacebestillapp.com${path}`, { method, headers: { "User-Agent": PHONE, "Sec-Fetch-Dest": "document", ...headers } });
async function hit(env, request) {
  const waits = [];
  const res = await worker.fetch(request, env, { waitUntil: (p) => waits.push(p) });
  await Promise.all(waits);
  return res;
}
const mkEnv = (over = {}) => ({ DB: fakeDb(), VISIT_RL: { limit: async () => ({ success: true }) }, ASSETS: { fetch: async () => new Response("page") }, ...over });

test("tagged links and social referrers count under the right source", () => {
  assert.equal(visitSource(req("/?utm_source=threads")), "threads");
  assert.equal(visitSource(req("/?utm_source=Instagram")), "instagram");
  assert.equal(visitSource(req("/es/?src=ig")), "instagram");
  assert.equal(visitSource(req("/?src=fb")), "facebook");
  assert.equal(visitSource(req("/", { Referer: "https://l.instagram.com/" })), "instagram");
  assert.equal(visitSource(req("/", { Referer: "https://l.threads.net/" })), "threads");
  assert.equal(visitSource(req("/", { Referer: "https://m.facebook.com/" })), "facebook");
});

test("previews, scripts, pictures, API calls, posts and untagged visits never count", () => {
  assert.equal(visitSource(req("/")), null);
  assert.equal(visitSource(req("/", { Referer: "https://www.google.com/" })), null);
  assert.equal(visitSource(req("/?utm_source=google")), null);
  assert.equal(visitSource(req("/?utm_source=threads", { "User-Agent": "facebookexternalhit/1.1" })), null);
  assert.equal(visitSource(req("/?utm_source=threads", { "User-Agent": "curl/8.7.1" })), null);
  assert.equal(visitSource(req("/social/ig/p1-1.png?utm_source=instagram", { "Sec-Fetch-Dest": "image" })), null);
  assert.equal(visitSource(req("/styles.css?utm_source=threads")), null);
  assert.equal(visitSource(req("/api/social-visits?utm_source=threads")), null);
  assert.equal(visitSource(req("/?utm_source=threads", {}, "POST")), null);
});

test("a tagged visit adds 1 to today's count, stores only day + source, and the page still loads", async () => {
  const env = mkEnv();
  const res = await hit(env, req("/?utm_source=threads"));
  assert.equal(res.status, 200);
  assert.equal(await res.text(), "page");
  assert.equal(env.DB.writes.length, 1);
  assert.deepEqual(env.DB.writes[0], [new Date().toISOString().slice(0, 10), "threads"], "only day and source are stored");
  await hit(env, req("/")); // untagged: no write
  assert.equal(env.DB.writes.length, 1);
});

test("over the per-visitor limit nothing is counted; a D1 failure never breaks the page", async () => {
  const limited = mkEnv({ VISIT_RL: { limit: async () => ({ success: false }) } });
  await hit(limited, req("/?utm_source=threads"));
  assert.equal(limited.DB.writes.length, 0);
  const broken = mkEnv({ DB: { prepare: () => { throw new Error("D1 down"); } } });
  const err = console.error; console.error = () => {};
  try { assert.equal((await hit(broken, req("/?utm_source=threads"))).status, 200); } finally { console.error = err; }
});

test("GET /api/social-visits reads 28-day totals per channel; other methods are refused", async () => {
  const env = mkEnv();
  for (const p of ["/?utm_source=threads", "/?utm_source=threads", "/?src=ig", "/?utm_source=facebook"]) await hit(env, req(p));
  env.DB.rows.set("2000-01-01|threads", 50); // older than 28 days: not in the total
  const res = await hit(env, new Request("https://peacebestillapp.com/api/social-visits"));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body.sources, { threads: 2, instagram: 1, facebook: 1 });
  assert.equal(body.total, 4);
  assert.equal(body.days, 28);
  assert.equal(body.counting_since, "2000-01-01");
  assert.equal((await hit(env, new Request("https://peacebestillapp.com/api/social-visits", { method: "POST" }))).status, 405);
});
