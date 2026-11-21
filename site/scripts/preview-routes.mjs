#!/usr/bin/env node
// The routes the site preview captures, from the PR body's "Preview routes: /a/,/b/" line (default
// "/,/es/"). The PR body is untrusted text: every route must start with "/" and use only
// [a-z0-9/_-], at most 12 of them, or the job stops (NAMED STOP [BAD_PREVIEW_ROUTES]).
// CLI: BODY="<pr body>" node site/scripts/preview-routes.mjs  -> prints the comma list
export function previewRoutes(body = "") {
  const line = String(body).split(/\r?\n/).find((l) => /^Preview routes:/.test(l));
  if (!line) return ["/", "/es/"];
  const routes = line.replace(/^Preview routes:/, "").split(",").map((r) => r.trim()).filter(Boolean);
  if (!routes.length || routes.length > 12 || !routes.every((r) => /^\/[a-z0-9/_-]*$/.test(r))) {
    throw new Error("NAMED STOP [BAD_PREVIEW_ROUTES] each route must start with / and use only a-z 0-9 / _ - (at most 12)");
  }
  return routes;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  try { console.log(previewRoutes(process.env.BODY).join(",")); }
  catch (e) { console.error(e.message); process.exit(1); }
}
