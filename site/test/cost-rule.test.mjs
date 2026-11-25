// The cost rule (Search Readiness i10): the rule lives where the next agent works, and code reads it.
// CLAUDE.md says "nothing paid" and points at docs/cost/zero-paid-llm.md; the search-loop engine's
// routing file (the only model call outside the app) holds max_cost_usd 0, no paid fallback and only
// models priced "0"; the website itself calls no model.
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const repo = new URL("../../", import.meta.url).pathname;
const read = (p) => readFileSync(join(repo, p), "utf8");
const DOC = "docs/cost/zero-paid-llm.md";

test("CLAUDE.md says nothing paid and links the cost doc, which exists", () => {
  const claude = read("CLAUDE.md");
  assert.match(claude, /nothing paid/i);
  assert.ok(claude.includes(DOC), `CLAUDE.md does not link ${DOC}`);
  assert.ok(existsSync(join(repo, DOC)), `${DOC} is missing`);
  assert.match(read(DOC), /search-loop drafting are \$0/);
});

test("search-loop drafting can only reach $0 models", () => {
  const cfg = JSON.parse(read("search-loop.config.json"));
  const routing = JSON.parse(read(cfg.llm.routing_file));
  assert.equal(routing.owner_policy.doc, DOC);
  assert.equal(routing.policy.max_cost_usd, 0);
  assert.equal(routing.policy.fallback_to_paid, false);
  assert.ok(routing.free_models.length > 0, "no free models listed");
  for (const m of routing.free_models) {
    assert.equal(m.pricing.prompt, "0", `${m.id} prompt price`);
    assert.equal(m.pricing.completion, "0", `${m.id} completion price`);
  }
});

test("the website calls no model: no model API host in the worker or the built pages", () => {
  const MODEL_HOSTS = /openrouter\.ai\/api|generativelanguage\.googleapis\.com|api\.openai\.com|api\.anthropic\.com|api\.deepseek\.com/;
  const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : /\.(js|mjs|html)$/.test(p) ? [p] : []; });
  const hits = [...walk(join(repo, "site/src")), ...walk(join(repo, "site/public"))].filter((f) => MODEL_HOSTS.test(readFileSync(f, "utf8")));
  assert.deepEqual(hits.map((f) => f.slice(repo.length)), []);
});
