// Renders the share pictures (og.png, og-es.png, og-ko.png, og-zh.png, og-prayer-points.png) from
// site/assets-src/og-*.html with headless Chrome. Each picture's store line is {{stores.line}}, filled
// from site/config/store.json (the one launch switch), so a store flip is: edit store.json, run
// `npm run og:render`, commit. site/assets-src/og.lock.json records the state each PNG was drawn in and
// its hash; site/test/og.test.mjs fails when the lock is behind store.json or a PNG is not the one drawn.
// Chrome: $CHROME, else the Mac app, else google-chrome.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fillStores, storeConfig, storeState, storeWords } from "../content/parts.mjs";

export const OG = [
  { src: "og-en.html", png: "og.png", lang: "en" },
  { src: "og-es.html", png: "og-es.png", lang: "es" },
  { src: "og-ko.html", png: "og-ko.png", lang: "ko" },
  { src: "og-zh.html", png: "og-zh.png", lang: "zh-Hans" },
  { src: "og-prayer-points.html", png: "og-prayer-points.png", lang: "en" },
];
const here = new URL("..", import.meta.url).pathname;
export const SRC = join(here, "assets-src"), PUB = join(here, "public"), LOCK = join(SRC, "og.lock.json");
// The picture line has no closing period (it is a label, set in capitals).
export const ogLine = (lang, store = storeConfig()) => storeWords(lang, store).line.replace(/[.。]$/, "");
export const sha = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const chrome = process.env.CHROME || ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome"].find((p) => existsSync(p));
  if (!chrome) { console.error("NAMED STOP [CHROME_MISSING] set CHROME to a Chrome or Chromium binary"); process.exit(1); }
  const store = storeConfig();
  const lock = { state: storeState(store), pictures: {} };
  for (const o of OG) {
    const html = readFileSync(join(SRC, o.src), "utf8");
    if (!html.includes("{{stores.line}}")) { console.error(`NAMED STOP [NO_OG_TOKEN] ${o.src} has no {{stores.line}}`); process.exit(1); }
    // Written beside the source so its relative font and logo paths resolve.
    const tmp = join(SRC, `.render-${o.src}`), png = join(PUB, o.png);
    // One sentence per line, so a two-store line never leaves a lone word on its own row.
    const drawn = ogLine(o.lang, store).split(/(?<=\.) /).join("<br>");
    writeFileSync(tmp, fillStores(html.replace("{{stores.line}}", drawn), o.lang, store));
    rmSync(png, { force: true });
    try {
      execFileSync(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-sandbox", "--allow-file-access-from-files", "--force-device-scale-factor=1", "--window-size=1200,630", "--virtual-time-budget=6000", `--screenshot=${png}`, `file://${tmp}`], { stdio: "ignore" });
    } finally { rmSync(tmp, { force: true }); }
    if (!existsSync(png)) { console.error(`NAMED STOP [RENDER_FAILED] Chrome wrote no ${o.png}`); process.exit(1); }
    lock.pictures[o.png] = { line: ogLine(o.lang, store), sha256: sha(png) };
  }
  writeFileSync(LOCK, `${JSON.stringify(lock, null, 2)}\n`);
  console.log(`OUTPUT og-render: ${OG.length} pictures drawn for store state "${lock.state}"`);
}
