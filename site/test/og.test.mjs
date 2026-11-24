// The share pictures say what store.json says (23 Nov 2026: the App Store went live and the pictures
// still said "coming soon"). og-render draws them from {{stores.line}}; this fails when store.json
// moved on and nobody ran `npm run og:render`, or a PNG was swapped by hand.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { storeConfig, storeState } from "../content/parts.mjs";
import { LOCK, OG, PUB, SRC, ogLine, sha } from "../scripts/og-render.mjs";

test("every share picture was drawn in today's store state, from the one store line", () => {
  const lock = JSON.parse(readFileSync(LOCK, "utf8"));
  const store = storeConfig();
  assert.equal(lock.state, storeState(store), "store.json changed: run npm run og:render");
  assert.equal(Object.keys(lock.pictures).length, OG.length);
  for (const o of OG) {
    const pic = lock.pictures[o.png];
    assert.ok(pic, `${o.png}: not in the lock`);
    assert.equal(pic.line, ogLine(o.lang, store), `${o.png}: drawn with an old store line`);
    assert.equal(pic.sha256, sha(join(PUB, o.png)), `${o.png}: not the picture og-render drew`);
    // The source holds the token, never a hand-typed launch line.
    const src = readFileSync(join(SRC, o.src), "utf8");
    assert.match(src, /\{\{stores\.line\}\}/, o.src);
    assert.doesNotMatch(src, /coming soon|muy pronto|即将|곧 /i, o.src);
  }
});
