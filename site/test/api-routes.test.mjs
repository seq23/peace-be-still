// peacebestillapp.com/api is shared: the chat Worker (worker/wrangler.jsonc routes) runs before the site Worker
// (custom domain), so a chat route that is too wide hides the site's own /api paths. That happened on 21 Nov
// 2026: the chat Worker's /api/* swallowed the waitlist remove link the privacy policy promises and
// /api/social-visits. Every chat path must be routed to the chat Worker, and no site path may be.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const jsonc = (text) => JSON.parse(text.replace(/^\s*\/\/.*$/gm, "").replace(/,(\s*[}\]])/g, "$1"));
const patterns = jsonc(read("worker/wrangler.jsonc")).routes.map((r) => r.pattern.replace(/^peacebestillapp\.com/, ""));
const routed = (path) => patterns.some((p) => (p.endsWith("*") ? path.startsWith(p.slice(0, -1)) : path === p));
const pathsIn = (text) => [...new Set([...text.matchAll(/["'`](\/api\/[a-z0-9/-]*)/g)].map((m) => m[1]))];

const chatSource = ["worker/src/index.ts", ...readdirSync(new URL("../../worker/src", import.meta.url)).filter((f) => /^madeForYou.*\.ts$/.test(f)).map((f) => `worker/src/${f}`)];
const chatPaths = chatSource.flatMap((f) => pathsIn(read(f)));
const sitePaths = pathsIn(read("site/src/app.js"));

test("every chat Worker path is routed to it, and no site Worker path is", () => {
  assert.ok(chatPaths.length >= 10 && chatPaths.includes("/api/review/unlock"), `chat paths read: ${chatPaths}`);
  assert.ok(sitePaths.includes("/api/waitlist/remove") && sitePaths.includes("/api/social-visits"), `site paths read: ${sitePaths}`);
  for (const p of chatPaths) assert.ok(routed(p), `${p} is served by the chat Worker but not routed to it`);
  for (const p of sitePaths) assert.ok(!routed(p), `${p} is the site's, but the chat Worker's routes take it`);
});

test("the check fails on the 21 Nov route", () => {
  const wide = ["/api/*"];
  const takes = (path) => wide.some((p) => path.startsWith(p.slice(0, -1)));
  assert.ok(sitePaths.some(takes));
});
