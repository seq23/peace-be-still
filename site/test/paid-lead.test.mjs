// Her yes (21 Nov 2026): on the site, the private-chat claim always says it is the paid plan's.
// Any "unlimited ... private" / "ilimitado ... privado" line in site/public must open with the lead.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const PUB = new URL("../public/", import.meta.url).pathname;
const CLAIM = /unlimited[^.<"]{0,40}private|(?:chat (?:bíblico )?)?ilimitado[^.<"]{0,40}privad/gi;
const LEAD = /(?:With a paid plan|Con un plan de pago): $/i;

export function unled(text) {
  return [...text.matchAll(CLAIM)].filter((m) => !LEAD.test(text.slice(Math.max(0, m.index - 30), m.index))).map((m) => text.slice(Math.max(0, m.index - 40), m.index + m[0].length));
}

test("the check catches a bare claim and passes one with the lead", () => {
  assert.equal(unled("<li>Unlimited Bible chat, kept private.</li>").length, 1);
  assert.equal(unled("<td>Chat bíblico ilimitado y privado.</td>").length, 1);
  assert.equal(unled("<b>With a paid plan: unlimited Bible chat, kept private.</b>").length, 0);
  assert.equal(unled("Con un plan de pago: chat bíblico ilimitado y privado.").length, 0);
});

test("no page in site/public states unlimited private chat without 'With a paid plan:' / 'Con un plan de pago:'", () => {
  const pages = [];
  (function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.(html|txt|xml|json)$/.test(f)) pages.push(p); } })(PUB);
  assert.ok(pages.length > 100, `only ${pages.length} pages read`);
  const hits = pages.flatMap((p) => unled(readFileSync(p, "utf8")).map((h) => `${p.slice(PUB.length)}: ${h}`));
  assert.deepEqual(hits, []);
});
