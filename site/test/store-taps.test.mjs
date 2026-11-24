// Store-page visits (scorecard row pbs-social, social_store_visits_28d): a tap on a store badge goes
// through /go/app-store or /go/google-play, adds 1 to D1 table store_taps (day, source, store) and gets a
// 302 to the listing built from store.json. Run against a real SQLite database with every migration in
// site/migrations applied, so the SQL the Worker runs in production is the SQL tested here.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import worker, { goTarget, tapSource, visitSource } from "../src/app.js";
import STORE from "../config/store.json" with { type: "json" };

const MIG = new URL("../migrations/", import.meta.url);
const migrations = () => readdirSync(MIG).filter((f) => f.endsWith(".sql")).sort();

/** A D1 binding over node:sqlite (prepare/bind/run/all/first), with every statement recorded. */
function d1(db = new DatabaseSync(":memory:")) {
  const env = {
    db,
    statements: [],
    prepare(sql) {
      let args = [];
      const stmt = {
        bind(...a) { args = a; return stmt; },
        async run() { env.statements.push([sql, args]); db.prepare(sql).run(...args); return { meta: {} }; },
        async all() { return { results: db.prepare(sql).all(...args) }; },
        async first() { return db.prepare(sql).get(...args) ?? null; },
      };
      return stmt;
    },
  };
  return env;
}
function migrated() {
  const DB = d1();
  for (const f of migrations()) DB.db.exec(readFileSync(new URL(f, MIG), "utf8"));
  return DB;
}
const IOS = "https://apps.apple.com/us/app/peace-be-still/id6837331126";
const LIVE = { ...STORE, app_store_url: IOS, play_url: null };
const PHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
const tap = (path, headers = {}, method = "GET") => new Request(`https://peacebestillapp.com${path}`, { method, headers: { "User-Agent": PHONE, "Sec-Fetch-Dest": "document", "CF-Connecting-IP": "203.0.113.9", ...headers } });
const mkEnv = (over = {}) => ({ DB: migrated(), VISIT_RL: { limit: async () => ({ success: true }) }, ASSETS: { fetch: async () => new Response("page") }, ...over });
async function hit(env, request) {
  const waits = [];
  const res = await worker.fetch(request, env, { waitUntil: (p) => waits.push(p) });
  await Promise.all(waits);
  return res;
}
const rows = (env) => env.DB.db.prepare("SELECT day, source, store, n FROM store_taps ORDER BY source, store").all().map((r) => ({ ...r }));
const today = () => new Date().toISOString().slice(0, 10);
const quiet = async (fn) => { const e = console.error; console.error = () => {}; try { return await fn(); } finally { console.error = e; } };

test("migrations are additive only, and each one writes its own schema_version row", () => {
  const files = migrations();
  assert.ok(files.includes("0003_store_taps.sql"));
  files.forEach((f, i) => {
    const sql = readFileSync(new URL(f, MIG), "utf8").replace(/--.*$/gm, "");
    assert.equal(Number(f.slice(0, 4)), i + 1, `${f}: numbered in order`);
    assert.doesNotMatch(sql, /\b(DROP|DELETE|UPDATE|ALTER\s+TABLE\s+\w+\s+(DROP|RENAME)|REPLACE\s+INTO)\b/i, `${f}: not additive`);
    assert.match(sql, new RegExp(`INSERT OR IGNORE INTO schema_version \\(version, applied_at\\) VALUES \\(${i + 1},`), `${f}: no schema_version row ${i + 1}`);
  });
  const DB = migrated();
  assert.deepEqual(DB.db.prepare("SELECT version FROM schema_version ORDER BY version").all().map((r) => r.version), files.map((_, i) => i + 1));
  // Applying them all again changes nothing (wrangler may re-run on a fresh deploy).
  for (const f of files) DB.db.exec(readFileSync(new URL(f, MIG), "utf8"));
  assert.equal(DB.db.prepare("SELECT COUNT(*) AS n FROM schema_version").get().n, files.length);
  // store_taps holds counts only: no column for a cookie, an IP, a user agent or a page address.
  assert.deepEqual(DB.db.prepare("PRAGMA table_info(store_taps)").all().map((c) => c.name), ["day", "source", "store", "n"]);
});

test("a tap on a live badge adds 1 under the page's channel and gets a 302 to the exact tagged listing", async () => {
  const env = mkEnv();
  // The person came from Threads to the grief page (its URL carries the tag), then tapped its badge.
  const grief = "https://peacebestillapp.com/questions/bible-verses-for-grief/?utm_source=threads";
  const go = "/go/app-store?ct=questions-bible-verses-for-grief&ppid=0c89f8e1-c5b6-4355-937d-af27c07ea8e3";
  const res = await hit(env, tap(go, { Referer: grief }));
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), `${IOS}?ppid=0c89f8e1-c5b6-4355-937d-af27c07ea8e3&ct=questions-bible-verses-for-grief&mt=8`);
  assert.equal(res.headers.get("Cache-Control"), "no-store");
  assert.equal(res.headers.get("Set-Cookie"), null);
  await hit(env, tap("/go/app-store?ct=home", { Referer: "https://peacebestillapp.com/?src=ig" }));
  await hit(env, tap("/go/app-store?ct=home", { Referer: "https://l.facebook.com/" }));
  await hit(env, tap("/go/app-store?ct=home", { Referer: "https://peacebestillapp.com/questions/" }));
  await hit(env, tap("/go/app-store?ct=home"));
  assert.deepEqual(rows(env), [
    { day: today(), source: "direct", store: "ios", n: 2 },
    { day: today(), source: "facebook", store: "ios", n: 1 },
    { day: today(), source: "instagram", store: "ios", n: 1 },
    { day: today(), source: "threads", store: "ios", n: 1 },
  ]);
  // Only day, source and store are ever written: nothing from the request but the channel name.
  for (const [sql, args] of env.DB.statements.filter(([s]) => /store_taps/.test(s))) {
    assert.match(sql, /^INSERT INTO store_taps \(day, source, store, n\)/);
    assert.deepEqual(args.slice(1), [args[1], "ios"]);
    assert.ok(["threads", "instagram", "facebook", "direct"].includes(args[1]));
    assert.doesNotMatch(JSON.stringify(args), /203\.0\.113|Mozilla|grief|ppid|http/);
  }
  // A /go/ tap is never also a page view.
  assert.equal(visitSource(tap("/go/app-store?ct=home", { Referer: grief })), null);
  assert.equal(env.DB.db.prepare("SELECT COUNT(*) AS n FROM social_visits").get().n, 0);
});

test("previews, scripts, prefetches, other methods and a store with no URL count nothing", async () => {
  for (const [r, why] of [
    [tap("/go/app-store", { "User-Agent": "facebookexternalhit/1.1" }), "link preview"],
    [tap("/go/app-store", { "User-Agent": "curl/8.7.1" }), "script"],
    [tap("/go/app-store", { "Sec-Fetch-Dest": "image" }), "not a page load"],
    [tap("/go/app-store", { "Sec-Purpose": "prefetch;prerender" }), "speculative prefetch"],
    [tap("/go/app-store", { Purpose: "prefetch" }), "old prefetch header"],
    [tap("/go/app-store", {}, "POST"), "POST"],
    [tap("/go/google-play"), "Google Play has no URL"],
    [new Request("https://www.peacebestillapp.com/go/app-store", { headers: { "User-Agent": PHONE } }), "www (it is 301'd first)"],
  ]) assert.equal(tapSource(r, LIVE), null, why);
  assert.deepEqual(tapSource(tap("/go/app-store"), LIVE), { source: "direct", store: "ios" });
  // No store URL at all: /go/ sends a person to the store box and counts nothing.
  assert.equal(goTarget(new URL("https://peacebestillapp.com/go/app-store?ct=home"), { ...LIVE, app_store_url: null }).location, "https://peacebestillapp.com/#get-the-app");
  assert.equal(tapSource(tap("/go/app-store"), { ...LIVE, app_store_url: null }), null);
  const env = mkEnv();
  const res = await hit(env, tap("/go/google-play?ct=home"));
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), STORE.play_url ? res.headers.get("Location") : "https://peacebestillapp.com/#get-the-app");
  if (!STORE.play_url) assert.deepEqual(rows(env), []);
});

test("a forged Referer or query can only pick which channel is counted, never where the 302 goes", async () => {
  const env = mkEnv();
  const res = await hit(env, tap("/go/app-store?ct=x%26next%3Dhttps%3A%2F%2Fevil.example&ppid=evil&next=https://evil.example", { Referer: "https://evil.example/?utm_source=threads" }));
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), IOS);
  assert.doesNotMatch(res.headers.get("Location"), /evil/);
  assert.deepEqual(rows(env).map((r) => r.source), ["direct"], "another site's own tag is not ours to read");
  const odd = await hit(env, tap("/go/app-store", { Referer: "not a url" }));
  assert.equal(odd.status, 302);
});

test("over the per-visitor limit nothing is counted, and the person still gets the listing", async () => {
  const env = mkEnv({ VISIT_RL: { limit: async ({ key }) => { assert.equal(key, "203.0.113.9"); return { success: false }; } } });
  const res = await hit(env, tap("/go/app-store?ct=home"));
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("Location"), `${IOS}?ct=home&mt=8`);
  assert.deepEqual(rows(env), []);
});

test("a D1 write failure never loses the tap's 302 (missing table, or D1 down)", async () => {
  for (const DB of [d1(), { prepare: () => { throw new Error("D1 down"); } }]) {
    const res = await quiet(() => hit(mkEnv({ DB }), tap("/go/app-store?ct=home")));
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("Location"), `${IOS}?ct=home&mt=8`);
  }
});

test("GET /api/social-visits answers the 28-day store taps: social channels in the total, direct shown apart", async () => {
  const env = mkEnv();
  const ins = env.DB.db.prepare("INSERT INTO store_taps (day, source, store, n) VALUES (?, ?, ?, ?)");
  ins.run(today(), "threads", "ios", 3); ins.run(today(), "threads", "play", 1); ins.run(today(), "instagram", "ios", 2);
  ins.run(today(), "direct", "ios", 9);
  // The 28-day window: day 27 back is in, day 28 back is out.
  const ago = (d) => new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);
  ins.run(ago(27), "facebook", "ios", 1); ins.run(ago(28), "facebook", "ios", 50);
  const body = await (await hit(env, new Request("https://peacebestillapp.com/api/social-visits"))).json();
  assert.deepEqual(body.store, { total: 7, sources: { threads: 4, instagram: 2, facebook: 1, direct: 9 }, counting_since: today() });
  assert.equal(body.total, 0, "page views are counted apart from taps");
  // Empty: a real 0, with the day counting started.
  const empty = await (await hit(mkEnv(), new Request("https://peacebestillapp.com/api/social-visits"))).json();
  assert.deepEqual(empty.store, { total: 0, sources: { threads: 0, instagram: 0, facebook: 0, direct: 0 }, counting_since: today() });
});

test("when store_taps cannot be read, the store block says why and has no number, and page views still answer", async () => {
  const DB = d1();
  for (const f of migrations().filter((f) => !f.startsWith("0003"))) DB.db.exec(readFileSync(new URL(f, MIG), "utf8"));
  const res = await hit(mkEnv({ DB }), new Request("https://peacebestillapp.com/api/social-visits"));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.total, 0);
  assert.equal(body.store.total, null);
  assert.match(body.store.why, /store_taps could not be read: .*no such table: store_taps/);
  assert.equal(body.store.sources, undefined);
});
