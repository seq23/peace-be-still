// Behaviour of the social visit counter (scorecard row pbs-social): a person opening a page from a
// tagged Threads/Instagram/Facebook link adds 1 to that day's count; previews, scripts, pictures and
// untagged visits never count; nothing personal is stored; GET /api/social-visits reads the totals.
// And store-page visits: a tap on a store badge (/go/app-store, /go/google-play) counts under the channel
// the person arrived from, then goes to the listing; nothing from the request reaches the redirect target.
import test from "node:test";
import assert from "node:assert/strict";
import worker, { countTap, goTarget, tapSource, visitSource } from "../src/app.js";
import { storeConfig } from "../content/parts.mjs";
import { goHref } from "../content/store-links.mjs";

function fakeDb() {
  const rows = new Map(); // `${day}|${source}` -> n
  const taps = new Map(); // `${day}|${source}|${store}` -> n
  const db = {
    rows,
    taps,
    writes: [],
    tapWrites: [],
    started: "2026-11-23",
    prepare(sql) {
      let args = [];
      const tapSql = /store_taps/.test(sql);
      const stmt = {
        bind(...a) { args = a; return stmt; },
        async run() {
          if (tapSql) {
            assert.match(sql, /^INSERT INTO store_taps \(day, source, store, n\)/);
            db.tapWrites.push(args);
            const k = args.join("|"); taps.set(k, (taps.get(k) ?? 0) + 1);
          } else {
            assert.match(sql, /^INSERT INTO social_visits \(day, source, n\)/);
            db.writes.push(args);
            const k = `${args[0]}|${args[1]}`; rows.set(k, (rows.get(k) ?? 0) + 1);
          }
          return { meta: { changes: 1 } };
        },
        async all() {
          const sums = {};
          for (const [k, n] of tapSql ? taps : rows) { const [day, source] = k.split("|"); if (day >= args[0]) sums[source] = (sums[source] ?? 0) + n; }
          return { results: Object.entries(sums).map(([source, n]) => ({ source, n })) };
        },
        async first() {
          if (/schema_version WHERE version = 3/.test(sql)) return db.started ? { day: db.started } : null;
          return { day: [...rows.keys()].map((k) => k.split("|")[0]).sort()[0] ?? null };
        },
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

// ---- store-page visits ---------------------------------------------------------------------
const IOS = "https://apps.apple.com/us/app/peace-be-still/id1";
const PLAY = "https://play.google.com/store/apps/details?id=x";
const LIVE = { app_store_url: IOS, play_url: PLAY, app_store_pt: "123", custom_pages: [{ page: "grief", ppid: "g-1", paths: ["questions/bible-verses-for-grief/"] }] };
const tap = (path, referer, headers = {}) => req(path, { ...(referer ? { Referer: referer } : {}), ...headers });
const href = (h) => h.replace(/&amp;/g, "&");

test("a tap on a store badge counts under the channel the person arrived from; anything else is direct, never in the social total", () => {
  const go = href(goHref("ios", LIVE, "questions-bible-verses-for-grief", "questions/bible-verses-for-grief/index.html"));
  assert.deepEqual(tapSource(tap(go, "https://peacebestillapp.com/questions/bible-verses-for-grief/?utm_source=threads"), LIVE), { source: "threads", store: "ios" });
  assert.deepEqual(tapSource(tap("/go/google-play?ct=home", "https://peacebestillapp.com/?src=ig"), LIVE), { source: "instagram", store: "play" });
  assert.deepEqual(tapSource(tap("/go/google-play", "https://l.facebook.com/"), LIVE), { source: "facebook", store: "play" });
  assert.deepEqual(tapSource(tap("/go/app-store", "https://peacebestillapp.com/"), LIVE), { source: "direct", store: "ios" });
  assert.deepEqual(tapSource(tap("/go/app-store", "https://www.google.com/"), LIVE), { source: "direct", store: "ios" });
  assert.deepEqual(tapSource(tap("/go/app-store"), LIVE), { source: "direct", store: "ios" });
  // Not a person, not a tap, not a store: nothing.
  assert.equal(tapSource(tap("/go/app-store", "https://peacebestillapp.com/?utm_source=threads", { "User-Agent": "facebookexternalhit/1.1" }), LIVE), null);
  assert.equal(tapSource(tap("/go/app-store", null, { "User-Agent": "curl/8.7.1" }), LIVE), null);
  assert.equal(tapSource(tap("/go/app-store", null, { "Sec-Fetch-Dest": "image" }), LIVE), null);
  assert.equal(tapSource(tap("/go/app-store", null, {}), LIVE) !== null, true);
  assert.equal(tapSource(req("/go/app-store", {}, "POST"), LIVE), null);
  assert.equal(tapSource(tap("/go/elsewhere"), LIVE), null);
  assert.equal(tapSource(tap("/?utm_source=threads"), LIVE), null);
});

test("/go/ sends the person to the exact tagged listing; a ct or ppid that is not ours is dropped (never an open redirect)", () => {
  const u = (p) => new URL(`https://peacebestillapp.com${p}`);
  assert.equal(goTarget(u("/go/app-store?ct=questions-bible-verses-for-grief&ppid=g-1"), LIVE).location, `${IOS}?ppid=g-1&pt=123&ct=questions-bible-verses-for-grief&mt=8`);
  assert.equal(goTarget(u("/go/google-play?ct=home"), LIVE).location, `${PLAY}&referrer=${encodeURIComponent("utm_source=peacebestillapp.com&utm_medium=site&utm_campaign=home")}`);
  assert.equal(goTarget(u("/go/app-store?ppid=https://evil.example/&ct=home"), LIVE).location, `${IOS}?pt=123&ct=home&mt=8`);
  for (const bad of ["https://evil.example", "home&mt=1", "Home", "-x", "a b", "x".repeat(121)]) {
    assert.equal(goTarget(u(`/go/app-store?ct=${encodeURIComponent(bad)}`), LIVE).location, IOS, bad);
  }
  for (const p of ["/go/app-store?ct=home&ppid=g-1", "/go/google-play?ct=home&url=https://evil.example"]) {
    const loc = new URL(goTarget(u(p), LIVE).location);
    assert.ok(["apps.apple.com", "play.google.com"].includes(loc.hostname), loc.href);
  }
  // A store with no URL yet: back to the page's own store box, and it is not a store visit.
  const none = { ...LIVE, app_store_url: null };
  assert.equal(goTarget(u("/go/app-store?ct=home"), none).location, "https://peacebestillapp.com/#get-the-app");
  assert.equal(goTarget(u("/go/app-store?ct=home"), none).target, null);
  assert.equal(tapSource(tap("/go/app-store", "https://peacebestillapp.com/?utm_source=threads"), none), null);
  assert.equal(goTarget(u("/go/google-play"), none).target, PLAY, "each store flips on its own");
});

test("a tap adds 1 to today's store_taps row (day, source, store only), within the visit limit, and is never a page view", async () => {
  const env = mkEnv();
  assert.equal(await countTap(tap("/go/app-store?ct=home", "https://peacebestillapp.com/?utm_source=threads"), env, LIVE), true);
  assert.deepEqual(env.DB.tapWrites, [[new Date().toISOString().slice(0, 10), "threads", "ios"]], "only day, source and store are stored");
  assert.equal(await countTap(tap("/go/app-store?ct=home", "https://peacebestillapp.com/?utm_source=threads"), env, { ...LIVE, app_store_url: null }), false);
  const limited = mkEnv({ VISIT_RL: { limit: async () => ({ success: false }) } });
  assert.equal(await countTap(tap("/go/app-store", "https://peacebestillapp.com/?utm_source=threads"), limited, LIVE), false);
  assert.equal(limited.DB.tapWrites.length, 0);
  // Through the Worker: /go/ answers 302 (no page is served) and adds nothing to the page-view count.
  for (const p of ["/go/app-store?utm_source=threads", "/go/google-play?src=ig"]) {
    assert.equal(visitSource(tap(p, "https://l.threads.net/")), null, p);
    const res = await hit(env, tap(p, "https://peacebestillapp.com/?utm_source=threads"));
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("Location"), goTarget(new URL(`https://peacebestillapp.com${p}`)).location);
    assert.equal(res.headers.get("Cache-Control"), "no-store");
  }
  assert.equal(env.DB.writes.length, 0, "a /go/ redirect was counted as a page view");
  // The bundled store.json decides whether a tap counts: a null URL counts nothing.
  const st = storeConfig();
  assert.equal(env.DB.tapWrites.length, 1 + (st.app_store_url ? 1 : 0) + (st.play_url ? 1 : 0));
});

test("GET /api/social-visits answers the 28-day store-page visits: threads + instagram + facebook make the total, direct is shown apart", async () => {
  const env = mkEnv();
  for (const [ref, p] of [["https://peacebestillapp.com/?utm_source=threads", "/go/app-store"], ["https://peacebestillapp.com/?utm_source=threads", "/go/google-play"], ["https://l.instagram.com/", "/go/app-store"], ["https://peacebestillapp.com/", "/go/app-store"], [null, "/go/google-play"]]) {
    assert.equal(await countTap(tap(p, ref), env, LIVE), true);
  }
  env.DB.taps.set("2000-01-01|threads|ios", 50); // older than 28 days
  const body = await (await hit(env, new Request("https://peacebestillapp.com/api/social-visits"))).json();
  assert.deepEqual(body.store, { total: 3, sources: { threads: 2, instagram: 1, facebook: 0, direct: 2 }, counting_since: "2026-11-23" });
  // Nothing tapped yet: a read zero with the day counting began, never a blank.
  const fresh = await (await hit(mkEnv(), new Request("https://peacebestillapp.com/api/social-visits"))).json();
  assert.deepEqual(fresh.store, { total: 0, sources: { threads: 0, instagram: 0, facebook: 0, direct: 0 }, counting_since: "2026-11-23" });
});
