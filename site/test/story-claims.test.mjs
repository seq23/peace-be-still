// The Bible stories are text and audio: no pictures. Nothing public may say they show faces or are
// illustrated (review of #91, 21 Nov 2026). Covers built pages, their generators, the search-loop
// voice, drafts and config, social drafts and the store files.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../../", import.meta.url).pathname;
const CLAIM = /black faces|drawn with (?:black )?faces|faces in the pictures|story pictures|illustrated (?:bible )?stor|rostros negros|imágenes de esta app|app's pictures|caras negras|dibujad|rostros y nombres negros/i;
const files = (dir) => {
  const out = [];
  (function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(html|mjs|json|md|txt|ts)$/.test(f)) out.push(p); } })(join(ROOT, dir));
  return out;
};

export function claimsIn(text) { return CLAIM.test(text); }

test("the phrase check catches the claim and lets plain story wording through", () => {
  assert.ok(claimsIn("Bible stories with Black faces"));
  assert.ok(claimsIn("each drawn with Black faces"));
  assert.ok(claimsIn("A new illustrated story every day"));
  assert.ok(claimsIn("una historia bíblica dibujada con rostros y nombres negros"));
  assert.ok(!claimsIn("Bible stories told in a Black church voice"));
});

test("no public page, generator, draft or store file says the stories show faces or pictures", () => {
  const scanned = [...files("site/public"), ...files("site/content"), ...files("data/search-loop"), ...files("data/drafts"), ...files("data/instagram"), ...files("store"), join(ROOT, "search-loop.config.json"), ...files("worker/src").filter((p) => !/\.d\.ts$/.test(p))].filter(existsSync);
  assert.ok(scanned.length > 100, `only ${scanned.length} files scanned`);
  const hits = scanned.filter((p) => claimsIn(readFileSync(p, "utf8"))).map((p) => p.slice(ROOT.length));
  assert.deepEqual(hits, []);
});
