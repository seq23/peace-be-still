import test from "node:test";
import assert from "node:assert/strict";
import { previewRoutes } from "../scripts/preview-routes.mjs";

test("routes come from the PR body line, defaulting to / and /es/", () => {
  assert.deepEqual(previewRoutes("no line here"), ["/", "/es/"]);
  assert.deepEqual(previewRoutes("x\r\nPreview routes: /ko/, /prayer-points/\r\ny"), ["/ko/", "/prayer-points/"]);
});

test("anything that could escape into a shell or another site is refused", () => {
  for (const bad of ["/ko/;curl x|sh", "/$(id)", "https://evil.example/", "ko/", "/a b", "/`id`", "/ÜBER/", "/a\"b"]) {
    assert.throws(() => previewRoutes(`Preview routes: ${bad}`), /BAD_PREVIEW_ROUTES/, bad);
  }
  assert.throws(() => previewRoutes(`Preview routes: ${Array(13).fill("/a/").join(",")}`), /BAD_PREVIEW_ROUTES/);
});
