// The store links, in one place, with no file reads: imported by the page builder (parts.mjs) and by the
// Worker (src/app.js), so the tagged listing URL has ONE definition.
// A page's badge links to our own /go/app-store or /go/google-play (goHref); the Worker counts the tap
// (scorecard row pbs-social, social_store_visits_28d) and redirects to the real listing (storeTarget),
// with Apple's pt/ct/mt=8 and Google Play's referrer= tags exactly as the badge used to carry them.

export const GO = { ios: "/go/app-store", play: "/go/google-play" };
// A page's campaign name (sourceOf in parts.mjs) and a custom product page id, as the Worker accepts them.
export const CT_RE = /^[a-z0-9][a-z0-9-]{0,119}$/;

/** The listing URL with the page's campaign tags (Apple App Analytics reads pt + ct; Play reads the referrer's utm fields). */
export function tagged(url, store, kind, source) {
  if (!source) return url;
  const sep = url.includes("?") ? "&" : "?";
  if (kind === "ios") return `${url}${sep}${store.app_store_pt ? `pt=${encodeURIComponent(store.app_store_pt)}&` : ""}ct=${source}&mt=8`;
  return `${url}${sep}referrer=${encodeURIComponent(`utm_source=peacebestillapp.com&utm_medium=site&utm_campaign=${source}`)}`;
}

/** The custom product page a page opens (store.json custom_pages: an exact path first, then the page's
 *  door, then the longest folder prefix), or null for the default product page. */
export function customPage(store, page = "", door = "neutral") {
  const path = String(page).replace(/^\/+/, "").replace(/(?:^|\/)index\.html$/, (m) => (m.startsWith("/") ? "/" : ""));
  const pages = store.custom_pages || [];
  const exact = pages.find((c) => [...(c.paths || []), ...(c.waiting_on_pr85 || [])].includes(path));
  const byDoor = exact ? null : pages.find((c) => (c.doors || []).includes(door));
  const prefix = exact || byDoor ? null : pages.flatMap((c) => (c.prefixes || []).map((pre) => ({ pre, c }))).filter((x) => path.startsWith(x.pre)).sort((x, y) => y.pre.length - x.pre.length)[0]?.c;
  return exact || byDoor || prefix || null;
}

const withPpid = (url, ppid) => (ppid ? `${url}${url.includes("?") ? "&" : "?"}ppid=${ppid}` : url);

/** The App Store link for a page (its path under site/public), before the ct= tag. */
export function appStoreHref(store, page = "", door = "neutral") {
  if (!store.app_store_url) return null;
  return withPpid(store.app_store_url, customPage(store, page, door)?.ppid);
}

/** The same-origin href a page's badge carries: /go/<store> with the page's campaign and, for the App
 *  Store, its custom product page. */
export function goHref(kind, store, source = "", page = "", door = "neutral") {
  const q = new URLSearchParams();
  if (source) q.set("ct", source);
  const ppid = kind === "ios" ? customPage(store, page, door)?.ppid : null;
  if (ppid) q.set("ppid", ppid);
  const s = q.toString();
  return `${GO[kind]}${s ? `?${s.replace(/&/g, "&amp;")}` : ""}`;
}

/** Where /go/<store> sends a person: the store listing built only from store.json, with the campaign
 *  and custom product page kept when they are valid (an unknown ppid or a malformed ct is dropped, so
 *  nothing from the request ever reaches the redirect target). null while that store has no URL. */
export function storeTarget(kind, store, { ct = "", ppid = "" } = {}) {
  const base = kind === "ios" ? store.app_store_url : store.play_url;
  if (!base) return null;
  const source = CT_RE.test(ct || "") ? ct : "";
  const known = kind === "ios" && (store.custom_pages || []).some((c) => c.ppid === ppid) ? ppid : null;
  return tagged(kind === "ios" ? withPpid(base, known) : base, store, kind, source);
}
