// Behaviour of the launch waitlist (app-security: honeypot, rate limit, consent, same-origin, removal).
import test from "node:test";
import assert from "node:assert/strict";
import worker, { DAILY_CEILING } from "../src/app.js";

function fakeDb() {
  const rows = [];
  const db = {
    rows,
    prepare(sql) {
      let args = [];
      const stmt = {
        bind(...a) { args = a; return stmt; },
        async first() {
          if (/COUNT\(\*\)/.test(sql)) return { n: rows.filter((r) => r.created_at >= args[0]).length };
          throw new Error("unexpected first: " + sql);
        },
        async run() {
          if (/^INSERT/.test(sql)) {
            const [email, language, door, consent_text, source_path, remove_token, created_at] = args;
            if (rows.some((r) => r.email === email)) return { meta: { changes: 0 } };
            rows.push({ email, language, door, consent: 1, consent_text, source_path, remove_token, created_at });
            return { meta: { changes: 1 } };
          }
          if (/^DELETE/.test(sql)) {
            const i = rows.findIndex((r) => r.remove_token === args[0]);
            if (i >= 0) rows.splice(i, 1);
            return { meta: { changes: i >= 0 ? 1 : 0 } };
          }
          throw new Error("unexpected run: " + sql);
        },
      };
      return stmt;
    },
  };
  return db;
}
const env = (over = {}) => ({ DB: fakeDb(), WAITLIST_RL: { limit: async () => ({ success: true }) }, ASSETS: { fetch: async () => new Response("asset") }, ...over });
const post = (path, fields, headers = {}) => new Request(`https://peacebestillapp.com${path}`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded", Origin: "https://peacebestillapp.com", "Sec-Fetch-Site": "same-origin", "CF-Connecting-IP": "203.0.113.9", ...headers },
  body: new URLSearchParams(fields).toString(),
});
const good = { email: "Reader@Example.org", consent: "yes", lang: "en", door: "gods-word", page: "/questions/psalms-for-sleep/" };

test("a valid sign-up is stored once, lower-cased, with consent text, ISO created_at and a remove link", async () => {
  const e = env();
  const res = await worker.fetch(post("/api/waitlist", good), e);
  assert.equal(res.status, 200);
  assert.equal(e.DB.rows.length, 1);
  const r = e.DB.rows[0];
  assert.equal(r.email, "reader@example.org");
  assert.equal(r.door, "gods-word");
  assert.equal(r.source_path, "/questions/psalms-for-sleep/");
  assert.match(r.created_at, /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
  assert.ok(r.consent_text.length > 10);
  assert.ok((await res.text()).includes(`/waitlist/remove?t=${r.remove_token}`));
  const again = await worker.fetch(post("/api/waitlist", good), e);
  assert.equal(again.status, 200);
  assert.equal(e.DB.rows.length, 1);
  assert.ok(!(await again.text()).includes("remove?t="), "a duplicate never reveals the remove link");
});

test("the honeypot answers like success and stores nothing", async () => {
  const e = env();
  const res = await worker.fetch(post("/api/waitlist", { ...good, website: "http://spam.example" }), e);
  assert.equal(res.status, 200);
  assert.equal(e.DB.rows.length, 0);
});

test("no consent, a bad email, or an oversized body is refused and stores nothing", async () => {
  const e = env();
  assert.equal((await worker.fetch(post("/api/waitlist", { ...good, consent: "" }), e)).status, 400);
  assert.equal((await worker.fetch(post("/api/waitlist", { ...good, email: "not-an-email" }), e)).status, 400);
  assert.equal((await worker.fetch(post("/api/waitlist", { ...good, email: "x".repeat(3000) + "@a.org" }), e)).status, 413);
  assert.equal(e.DB.rows.length, 0);
});

test("over the per-IP limit answers 429; over the daily ceiling answers 503", async () => {
  const e = env({ WAITLIST_RL: { limit: async ({ key }) => ({ success: !key.includes("203.0.113.9") }) } });
  assert.equal((await worker.fetch(post("/api/waitlist", good), e)).status, 429);
  const f = env();
  const now = new Date().toISOString();
  for (let i = 0; i < DAILY_CEILING; i++) f.DB.rows.push({ email: `p${i}@example.org`, created_at: now });
  assert.equal((await worker.fetch(post("/api/waitlist", { ...good, email: "late@example.org" }), f)).status, 503);
});

test("a cross-site post is refused; GET on the endpoint is not allowed", async () => {
  const e = env();
  assert.equal((await worker.fetch(post("/api/waitlist", good, { Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site" }), e)).status, 403);
  assert.equal((await worker.fetch(new Request("https://peacebestillapp.com/api/waitlist"), e)).status, 405);
  assert.equal(e.DB.rows.length, 0);
});

test("the remove link deletes the row; an unknown token changes nothing and says the same", async () => {
  const e = env();
  await worker.fetch(post("/api/waitlist", good), e);
  const tok = e.DB.rows[0].remove_token;
  const unknown = await worker.fetch(post("/api/waitlist/remove", { t: "0".repeat(48), lang: "en" }), e);
  assert.equal(unknown.status, 200);
  assert.equal(e.DB.rows.length, 1);
  const res = await worker.fetch(post("/api/waitlist/remove", { t: tok, lang: "en" }), e);
  assert.equal(res.status, 200);
  assert.equal(e.DB.rows.length, 0);
});

test("www redirects to the apex with path and query", async () => {
  const res = await worker.fetch(new Request("https://www.peacebestillapp.com/es/?a=1"), env());
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("Location"), "https://peacebestillapp.com/es/?a=1");
});
