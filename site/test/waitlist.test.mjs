// Behaviour of the closed launch waitlist: sign-ups refused and nothing stored (owner 18 Nov 2026), the
// remove link still deletes a stored row, same-origin enforced, www redirect.
import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/app.js";

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

const seeded = () => { const e = env(); e.DB.rows.push({ email: "reader@example.org", remove_token: "a".repeat(48), created_at: "2026-11-01T00:00:00Z" }); return e; };

test("sign-ups are closed: a valid post answers 410, stores nothing, and points to the stores", async () => {
  const e = env();
  const res = await worker.fetch(post("/api/waitlist", good), e);
  assert.equal(res.status, 410);
  assert.equal(e.DB.rows.length, 0);
  assert.match(await res.text(), /App Store and Google Play/);
});

test("a cross-site post is refused; GET on the endpoint is not allowed", async () => {
  const e = seeded();
  assert.equal((await worker.fetch(post("/api/waitlist/remove", { t: "a".repeat(48), lang: "en" }, { Origin: "https://evil.example", "Sec-Fetch-Site": "cross-site" }), e)).status, 403);
  assert.equal((await worker.fetch(new Request("https://peacebestillapp.com/api/waitlist"), e)).status, 405);
  assert.equal(e.DB.rows.length, 1);
});

test("the remove link still deletes a stored row; an unknown token changes nothing and says the same", async () => {
  const e = seeded();
  const unknown = await worker.fetch(post("/api/waitlist/remove", { t: "0".repeat(48), lang: "en" }), e);
  assert.equal(unknown.status, 200);
  assert.equal(e.DB.rows.length, 1);
  const res = await worker.fetch(post("/api/waitlist/remove", { t: "a".repeat(48), lang: "en" }), e);
  assert.equal(res.status, 200);
  assert.equal(e.DB.rows.length, 0);
});

test("www redirects to the apex with path and query", async () => {
  const res = await worker.fetch(new Request("https://www.peacebestillapp.com/es/?a=1"), env());
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("Location"), "https://peacebestillapp.com/es/?a=1");
});

test("a moved page answers 301 to its new home, with or without the trailing slash", async () => {
  for (const path of ["/questions/black-bible-app/", "/questions/black-bible-app"]) {
    const res = await worker.fetch(new Request(`https://peacebestillapp.com${path}`), env());
    assert.equal(res.status, 301);
    assert.equal(res.headers.get("Location"), "https://peacebestillapp.com/black-bible-app/");
  }
  assert.equal((await worker.fetch(new Request("https://peacebestillapp.com/black-bible-app/"), env())).status, 200);
});
