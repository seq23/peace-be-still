// The footer's "updated" date is the page's own, in each language's form (never a hard-coded date).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { footerHtml, updatedText } from "../content/parts.mjs";

test("each language writes the page's date its own way", () => {
  assert.equal(updatedText("2026-12-02", "ko"), "2026년 12월 2일");
  assert.equal(updatedText("2026-12-02", "zh-Hans"), "2026年12月2日");
  assert.equal(updatedText("2026-12-02", "en"), "2 Dec 2026");
  assert.equal(updatedText("18 Nov 2026", "es"), "18 nov 2026");
  assert.match(footerHtml("ko", "2027-01-05"), /2027년 1월 5일 업데이트/);
  assert.match(footerHtml("en", "2027-01-05"), /Updated 5 Jan 2027/);
  assert.throws(() => updatedText("soon", "en"), /BAD_UPDATED_DATE/);
});

test("a built page's footer date equals its dateModified", () => {
  for (const [path, lang] of [["ko/index.html", "ko"], ["zh/index.html", "zh-Hans"], ["zh/questions/bedtime-prayer/index.html", "zh-Hans"], ["prayer-points/index.html", "en"], ["questions/black-people-in-the-bible/index.html", "en"]]) {
    const html = readFileSync(new URL(`../public/${path}`, import.meta.url), "utf8");
    const mod = html.match(/"dateModified":"(\d{4}-\d\d-\d\d)"/)[1];
    const foot = html.match(/<footer[\s\S]*?<\/footer>/)[0];
    assert.ok(foot.includes(updatedText(mod, lang)), `${path}: footer does not show ${mod}`);
  }
});
