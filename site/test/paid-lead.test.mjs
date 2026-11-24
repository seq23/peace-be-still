// Her yes (21 Nov 2026): on the site, the private-chat claim always says it is the paid plan's.
// Any "unlimited ... private" / "ilimitado ... privado" line in site/public must open with the lead.
import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { facts } from "../content/parts.mjs";

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

// Her ruling 24 Nov 2026: "unlimited is what we are selling like the competitors", and the 50 a day is the small
// print. So wherever a page sells unlimited chat, the small print (from PAID_CHAT_MESSAGES) follows it.
const UNLIMITED = /\bunlimited (?:Bible )?chat\b|\bchat (?:bíblico )?ilimitado\b/gi;
export function unsmall(text, paid) {
  const small = [`Private for your first ${paid} messages each day`, `Privado en los primeros ${paid} mensajes de cada día`];
  return [...text.matchAll(UNLIMITED)].filter((m) => !small.some((s) => text.slice(m.index, m.index + 700).includes(s)))
    .map((m) => text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40));
}

test("the small-print check catches an unlimited claim with no small print, and passes one with it", () => {
  const paid = facts().paid;
  assert.equal(unsmall("<b>With a paid plan: unlimited Bible chat.</b> Your private chats are never used to train AI.", paid).length, 1);
  assert.equal(unsmall(`<b>With a paid plan: unlimited Bible chat.</b> <small>Private for your first ${paid} messages each day; after that</small>`, paid).length, 0);
  assert.equal(unsmall(`Chat bíblico ilimitado. Privado en los primeros ${paid + 1} mensajes de cada día`, paid).length, 1);
});

test("every page in site/public that sells unlimited chat carries the small print right after it", () => {
  const pages = [];
  (function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.html$/.test(f)) pages.push(p); } })(PUB);
  const paid = facts().paid;
  const read = (p) => readFileSync(p, "utf8").replace(/’/g, "'");
  const selling = pages.filter((p) => [...read(p).matchAll(UNLIMITED)].length > 0);
  assert.ok(selling.length > 20, `only ${selling.length} pages sell unlimited chat: the scan read nothing`);
  assert.deepEqual(pages.flatMap((p) => unsmall(read(p), paid).map((h) => `${p.slice(PUB.length)}: ${h}`)), []);
});
