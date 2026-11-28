// The store links, in one place, with no file reads: imported by the page builder (parts.mjs) and by the
// Worker (src/app.js), so the tagged listing URL has ONE definition, built only from site/config/store.json.
// A page's badge links to our own /api/go/app-store or /api/go/google-play (goHref); the Worker counts the tap
// (scorecard row pbs-social, social_store_visits_28d) and redirects to the real listing (storeTarget),
// with Apple's pt/ct/mt=8 and Google Play's referrer= tags exactly as the badge used to carry them.

export const GO = { ios: "/api/go/app-store", play: "/api/go/google-play" };

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

const withParam = (name) => (url, value) => (value ? `${url}${url.includes("?") ? "&" : "?"}${name}=${value}` : url);
const withPpid = withParam("ppid");
/** Google Play's custom store listing for the page (store.json custom_pages[].play_listing: the listing's unique-URL
 *  parameter, Play Console > Store listings), opened by &listing= on the default listing URL. */
const withListing = withParam("listing");

/** The App Store link for a page (its path under site/public), before the ct= tag; null while the App Store has no URL. */
export function appStoreHref(store, page = "", door = "neutral") {
  if (!store.app_store_url) return null;
  return withPpid(store.app_store_url, customPage(store, page, door)?.ppid);
}

/** The Google Play link for a page, before the referrer tag: its custom store listing when it has one; null while Play has no URL. */
export function playHref(store, page = "", door = "neutral") {
  if (!store.play_url) return null;
  return withListing(store.play_url, customPage(store, page, door)?.play_listing);
}

/** The exact listing a page's badge leads to (what /api/go/ redirects that badge to). */
export function listingHref(kind, store, source = "", page = "", door = "neutral") {
  const base = kind === "ios" ? appStoreHref(store, page, door) : playHref(store, page, door);
  return base ? tagged(base, store, kind, source) : null;
}

/** The same-origin href a page's badge carries: /api/go/<store> with the page's campaign and its custom page:
 *  the App Store's custom product page (ppid) or Google Play's custom store listing (listing), HTML-escaped. */
export function goHref(kind, store, source = "", page = "", door = "neutral") {
  const q = new URLSearchParams();
  if (source) q.set("ct", source);
  const custom = customPage(store, page, door);
  if (kind === "ios" && custom?.ppid) q.set("ppid", custom.ppid);
  if (kind === "play" && custom?.play_listing) q.set("listing", custom.play_listing);
  const s = q.toString();
  return `${GO[kind]}${s ? `?${s.replace(/&/g, "&amp;")}` : ""}`;
}

/** Where /api/go/<store> sends a person: the store listing built only from store.json, with the campaign
 *  and custom page kept only when they are ours (a ct that is not one of our pages' campaign names in
 *  site/config/campaigns.json, or a ppid or Play listing not in store.json, is dropped: nothing typed into
 *  the request ever reaches the redirect target). null while that store has no URL. */
export function storeTarget(kind, store, { ct = "", ppid = "", listing = "" } = {}, campaigns = []) {
  const base = kind === "ios" ? store.app_store_url : kind === "play" ? store.play_url : null;
  if (!base) return null;
  const source = ct && campaigns.includes(ct) ? ct : "";
  const known = kind === "ios" && ppid && (store.custom_pages || []).some((c) => c.ppid === ppid) ? ppid : null;
  const play = kind === "play" && listing && (store.custom_pages || []).find((c) => c.play_listing && c.play_listing === listing)?.play_listing;
  return tagged(kind === "ios" ? withPpid(base, known) : withListing(base, play || null), store, kind, source);
}
