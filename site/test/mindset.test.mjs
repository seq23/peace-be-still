// The Mindset door on the website (21 Nov 2026): the hub, its question pages and the two-door home page.
// Each test is a reviewer's fail written down: faith words on a Mindset page, manifesting words where the
// faith door sees, an "unlimited ... private" line without its paid-plan qualifier, a typed count, an
// outcome or health promise, trial or urgency wording, filler copy, too few pages, a wrong store page.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { PAGES } from "../content/questions.mjs";
import { MINDSET } from "../content/mindset.mjs";
import { appStoreHref, claimHtml, facts, storeConfig } from "../content/parts.mjs";

const ROOT = new URL("../../", import.meta.url).pathname;
const pub = join(ROOT, "site/public/");
const read = (rel) => readFileSync(join(pub, rel), "utf8");
const built = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith(".html")) built.push(p.slice(pub.length)); } })(pub);
const doorOf = (html) => html.match(/<meta name="pbs:door" content="(\w+)"/)?.[1] || "neutral";
const pagesOf = (door) => built.filter((rel) => doorOf(read(rel)) === door);
// What a reader sees: tags and attribute values out, entities decoded.
const words = (html) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, " ");
const seen = (html) => `${words(html)} ${html.match(/<title>([^<]*)/)?.[1] || ""} ${html.match(/<meta name="description" content="([^"]*)"/)?.[1] || ""}`;

const FAITH = /\b(bibles?|biblical|god|god's|gods|jesus|christ|christian|scriptures?|verses?|kjv|king james|church|pray|prays|prayed|prayers?|praying|faith|lord|psalms?|biblia|bíblic[oa]s?|dios|jesucristo|jesús|escrituras?|versículos?|iglesia|orar|oración|oraciones|señor|salmos?)\b/i;
const MANIFEST = /\bmanifest(ing|ation|ations|s|ed)?\b|\buniverse\b|law of attraction|vibrations?\b|\bmanifestar|\buniverso\b|ley de (la )?atracción|vibraci[oó]n/i;
const PROMISE = /\bwill (manifest|attract|bring you|change your life|come true|happen for you)|guarantee[ds]?\b|\bcures?\b|\b(treats?|cures?|heals?|fix(es)?) (your )?(anxiety|depression|insomnia|stress|panic)|\bheals?\b|\bhealing\b|relieves? (anxiety|stress|depression)|reduces? (anxiety|stress)|clinically|proven to|scientifically proven|garantiza|\bcura\b|curar|sana(r|rá)?\b|se cumplirá/i;
const URGENCY = /free trial|trial (ends|period)|start (a|your) trial|prueba gratis|limited time|act now|hurry|last chance|today only|don't miss|before it's gone|weekly (plan|subscription)|plan semanal|por tiempo limitado|última oportunidad/i;
const FILLER = /in today's fast-paced world|it'?s important to note|\bdelve\b|unlock (your|the)|embark|game[- ]changer|in conclusion|look no further|harness the power|transformative|tapestry|elevate your|navigate the (ups|complex)|whether you're a|supercharge|level up your|en el mundo acelerado de hoy|es importante tener en cuenta/i;

const enQ = pagesOf("mindset").filter((r) => r.startsWith("questions/"));
const esQ = pagesOf("mindset").filter((r) => r.startsWith("es/preguntas/"));
const mindsetBuilt = pagesOf("mindset");

test("the word lists catch what they are for and pass plain Mindset copy", () => {
  assert.ok(FAITH.test("Read the Bible tonight") && FAITH.test("una oración corta") && FAITH.test("Psalm 23"));
  assert.ok(!FAITH.test("A calm line to say out loud, morning and night. Godspeed is not here; nor is goodness."));
  assert.ok(MANIFEST.test("how to manifest") && MANIFEST.test("the universe has a plan") && MANIFEST.test("raise your vibration"));
  assert.ok(PROMISE.test("this will manifest your dream") && PROMISE.test("it can treat anxiety") && PROMISE.test("guaranteed results"));
  assert.ok(!PROMISE.test("It is a practice for your own mind, not a promise of any result. I treat myself like someone I am rooting for. Affirmations are not medical care."));
  assert.ok(URGENCY.test("Start your free trial") && URGENCY.test("limited time only"));
  assert.ok(FILLER.test("In today's fast-paced world, affirmations help."));
});

test("at least 24 English and 8 Spanish Mindset question pages are built (hard floor)", () => {
  assert.ok(enQ.length >= 24, `only ${enQ.length} English Mindset question pages`);
  assert.ok(esQ.length >= 8, `only ${esQ.length} Spanish Mindset question pages`);
  // Every Mindset entry in the generator is a built page marked Mindset (none skipped by the build).
  for (const p of PAGES.filter((x) => x.door === "mindset")) {
    const rel = `${p.path.replace(/^\//, "")}index.html`;
    assert.ok(existsSync(join(pub, rel)), `${p.path} is in the generator but not built`);
    assert.equal(doorOf(read(rel)), "mindset", p.path);
  }
});

test("no Mindset page carries a faith word (title, description, body, CTA and footer)", () => {
  assert.ok(mindsetBuilt.length >= 34, `only ${mindsetBuilt.length} Mindset pages read`);
  const hits = mindsetBuilt.map((rel) => [rel, seen(read(rel)).match(FAITH)?.[0]]).filter(([, w]) => w);
  assert.deepEqual(hits, []);
});

test("no faith page, and not the home page's God's Word card, carries manifesting words", () => {
  const faith = pagesOf("faith");
  assert.ok(faith.length >= 20, `only ${faith.length} faith pages read`);
  const hits = faith.map((rel) => [rel, seen(read(rel)).match(MANIFEST)?.[0]]).filter(([, w]) => w);
  assert.deepEqual(hits, []);
  for (const rel of ["index.html", "es/index.html"]) {
    const s = read(rel);
    const card = (id) => s.match(new RegExp(`<!-- door:${id} -->([\\s\\S]*?)<!-- /door:${id} -->`))?.[1];
    const faithCard = card("faith"), mindCard = card("mindset");
    assert.ok(faithCard && mindCard, `${rel}: both door cards`);
    assert.doesNotMatch(words(faithCard), MANIFEST, `${rel}: faith card`);
    assert.doesNotMatch(words(mindCard), FAITH, `${rel}: Mindset card`);
    // Equal weight: same markup, same number of points, each linking its own door.
    const shape = (c) => [c.match(/<div class="card door-card"/g)?.length, c.match(/<li>/g)?.length, c.match(/<h3>/g)?.length];
    assert.deepEqual(shape(faithCard), shape(mindCard), `${rel}: the two cards differ in weight`);
    assert.match(mindCard, rel.startsWith("es/") ? /href="\/es\/mentalidad\/"/ : /href="\/mindset\/"/);
    assert.match(faithCard, /href="#gods-word"|href="#palabra-de-dios"/);
    // The lead above the cards speaks to both doors: no faith or manifesting words.
    const hero = s.slice(s.indexOf("<main"), s.indexOf("<!-- door:faith -->"));
    assert.doesNotMatch(words(hero), FAITH, `${rel}: the lead above the doors`);
    assert.doesNotMatch(words(hero), MANIFEST, `${rel}: the lead above the doors`);
  }
});

test("every 'unlimited chat' line on Mindset pages and the home pages says it is the paid plan's (her ruling 24 Nov 2026: the headline is 'Unlimited chat')", () => {
  const check = [...mindsetBuilt, "index.html", "es/index.html"];
  let n = 0;
  for (const rel of check) {
    const t = words(read(rel));
    for (const m of t.matchAll(/unlimited (?:Bible )?chat|chat (?:bíblico )?ilimitado|unlimited[^.]{0,40}private|ilimitad[oa][^.]{0,40}privad[oa]/gi)) {
      n++;
      assert.match(t.slice(Math.max(0, m.index - 36), m.index), /(With a paid plan|Con un plan de pago): $/i, `${rel}: "${m[0]}" without the paid-plan qualifier`);
    }
  }
  assert.ok(n >= check.length, `only ${n} claims read on ${check.length} pages`);
});

test("message counts and prices come from the app's settings, never typed", () => {
  const f = facts();
  const gates = readFileSync(join(ROOT, "app/src/gates/index.ts"), "utf8");
  assert.equal(f.free, Number(gates.match(/FREE_CHAT_MESSAGES = (\d+);/)[1]));
  assert.equal(f.paid, Number(gates.match(/PAID_CHAT_MESSAGES = (\d+);/)[1]));
  // The generators hold no typed count or price.
  for (const src of ["site/content/mindset.mjs", "site/content/home.mjs"]) {
    const code = readFileSync(join(ROOT, src), "utf8");
    assert.doesNotMatch(code, /\b\d+ (private |privados )?(messages|mensajes)\b|\$\d+\.\d\d/, `${src}: a typed count or price`);
  }
  // Every count a built page says is one of the two settings.
  for (const rel of [...mindsetBuilt, "index.html", "es/index.html"]) {
    for (const m of words(read(rel)).matchAll(/\b(\d+) (?:private |privados )?(?:messages|mensajes)\b/g)) assert.ok([f.free, f.paid].includes(Number(m[1])), `${rel}: "${m[0]}"`);
  }
});

test("no outcome or health promise, no trial or urgency wording, no filler on Mindset pages and the home pages", () => {
  const hits = [];
  for (const rel of [...mindsetBuilt, "index.html", "es/index.html"]) {
    const t = seen(read(rel));
    for (const [re, why] of [[PROMISE, "promise"], [URGENCY, "urgency"], [FILLER, "filler"]]) if (re.test(t)) hits.push(`${rel}: ${why} (${t.match(re)[0]})`);
  }
  assert.deepEqual(hits, []);
});

test("each Mindset page answers first: the app comes only in its last section", () => {
  const app = /Peace Be Still|the app\b(?!\s+store)|our app|la app\b(?!\s+store)|nuestra app/i;
  const qs = MINDSET.filter((p) => !p.hub);
  assert.ok(qs.length >= 32);
  for (const p of qs) {
    for (const [k, v] of [["definition", p.definition], ["quick", p.quick], ...p.sections.slice(0, -1).map(([h, b]) => [h, `${h} ${b}`])]) assert.doesNotMatch(v, app, `${p.path}: the app is pitched in "${k}" before the answer is done`);
    assert.match(p.sections.at(-1).join(" "), /Peace Be Still/, `${p.path}: the last section names the app`);
    assert.ok(p.sections.length >= 3 && p.faq.length >= 3, `${p.path}: too thin`);
  }
});

test("the Mindset hub leads with the paid-plan privacy claim and opens the Imagination Nights store page", () => {
  for (const [rel, lang] of [["mindset/index.html", "en"], ["es/mentalidad/index.html", "es"]]) {
    const s = read(rel);
    assert.equal(doorOf(s), "mindset", rel);
    const claim = claimHtml(lang, "any");
    assert.match(claim, lang === "es" ? new RegExp(String.raw`<b>Con un plan de pago: chat ilimitado\.<\/b> <small>Privado en los primeros ${facts().paid} mensajes`) : new RegExp(String.raw`<b>With a paid plan: unlimited chat\.<\/b> <small>Private for your first ${facts().paid} messages`));
    const at = s.indexOf(claim);
    assert.ok(at > 0 && at - s.indexOf("</h1>") < 80, `${rel}: the claim is not the lead under the heading`);
    for (const name of ["Morning Word", "Imagination Nights"]) assert.ok(words(s).includes(name), `${rel}: ${name}`);
  }
  const store = { ...storeConfig(), app_store_url: "https://apps.apple.com/app/id1" };
  const ppid = store.custom_pages.find((c) => c.page === "imagination-nights").ppid;
  for (const rel of ["mindset/index.html", "es/mentalidad/index.html", enQ[0], esQ[0]]) {
    assert.equal(appStoreHref(store, rel, "mindset"), `${store.app_store_url}?ppid=${ppid}`, rel);
  }
  // A Spanish faith page keeps Mi Refugio; a neutral page keeps the default.
  const mi = store.custom_pages.find((c) => c.page === "mi-refugio").ppid;
  assert.equal(appStoreHref(store, "es/preguntas/salmos-para-dormir/index.html", "faith"), `${store.app_store_url}?ppid=${mi}`);
  assert.equal(appStoreHref(store, "questions/how-to-cancel-bible-app-subscription/index.html", "neutral"), store.app_store_url);
});

test("the footer links the Mindset hub on every page except God's Word pages", () => {
  for (const rel of ["index.html", "es/index.html", "about.html", "questions/index.html", "es/preguntas/index.html", enQ[0], esQ[0], "mindset/index.html"]) {
    const foot = read(rel).match(/<footer[\s\S]*?<\/footer>/)[0];
    assert.match(foot, rel.startsWith("es/") ? /href="\/es\/mentalidad\/"/ : /href="\/mindset\/"/, rel);
  }
  for (const rel of pagesOf("faith")) assert.doesNotMatch(read(rel), /href="\/(es\/mentalidad|mindset)\/"/, rel);
});

test("competitor facts on Mindset pages are sourced and dated", () => {
  for (const p of MINDSET.filter((x) => x.notAffiliated)) {
    assert.ok(p.sources?.length >= 1, `${p.path}: names another app with no source`);
    assert.match(p.sections.map((s) => s[1]).join(" "), /\b(read|checked|updated|edited|leído|revisado) \d{1,2} \w{3,4} 20\d\d/i, `${p.path}: no date on the facts`);
  }
});
