// The repo's one Pages publisher (scripts/lib/pages-publish.mjs), used by the app and site previews.
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { publishPages, waitUp, noindex } from "../../scripts/lib/pages-publish.mjs";

const dir = () => { const d = mkdtempSync(join(tmpdir(), "pp-")); writeFileSync(join(d, "index.html"), "<p>hi</p>"); return d; };
const env = { CLOUDFLARE_API_TOKEN: "t", CLOUDFLARE_ACCOUNT_ID: "a" };
const fake = (deployOut, projects = []) => {
  const calls = [];
  const run = (_cmd, args) => {
    calls.push(args.slice(3).join(" "));
    if (args[3] === "project" && args[4] === "list") return { status: 0, stdout: JSON.stringify(projects) };
    if (args[3] === "project" && args[4] === "create") return { status: 0, stdout: "" };
    return { status: 0, stdout: deployOut };
  };
  return { run, calls };
};
const OK = "✨ Deployment complete! Take a peek over at https://abc123.site-prev.pages.dev\n✨ Deployment alias URL: https://pr-1.site-prev.pages.dev";

test("creates a missing project, deploys on the branch, returns the confirmed URL", () => {
  const f = fake(OK);
  assert.equal(publishPages({ project: "site-prev", branch: "pr-1", directory: dir(), env, run: f.run }), "https://abc123.site-prev.pages.dev");
  assert.ok(f.calls.some((c) => c.startsWith("project create site-prev")));
  assert.ok(f.calls.some((c) => /^deploy .* --project-name site-prev --branch pr-1$/.test(c)));
});

test("an unconfirmed deploy, another project's URL, missing secrets or an empty folder are a named stop", () => {
  const stop = /PREVIEW_HOST_FAILED/;
  assert.throws(() => publishPages({ project: "site-prev", branch: "pr-1", directory: dir(), env, run: fake("Deployment status: unknown https://abc.site-prev.pages.dev").run }), stop);
  assert.throws(() => publishPages({ project: "site-prev", branch: "pr-1", directory: dir(), env, run: fake(OK.replaceAll("site-prev", "other")).run }), stop);
  assert.throws(() => publishPages({ project: "site-prev", branch: "pr-1", directory: dir(), env: {}, run: fake(OK).run }), stop);
  assert.throws(() => publishPages({ project: "site-prev", branch: "pr-1", directory: mkdtempSync(join(tmpdir(), "pp-")), env, run: fake(OK).run }), stop);
});

test("waitUp needs a 200; a preview that never answers is a named stop", async () => {
  assert.equal(await waitUp("https://x.pages.dev", { tries: 2, delayMs: 1, fetcher: async () => ({ status: 200 }) }), "https://x.pages.dev");
  await assert.rejects(waitUp("https://x.pages.dev", { tries: 2, delayMs: 1, fetcher: async () => { throw new Error("tls"); } }), /PREVIEW_HOST_FAILED/);
});

test("noindex keeps previews out of search", () => {
  const d = dir();
  noindex(d);
  assert.match(readFileSync(join(d, "_headers"), "utf8"), /X-Robots-Tag: noindex/);
  assert.match(readFileSync(join(d, "robots.txt"), "utf8"), /Disallow: \//);
});
