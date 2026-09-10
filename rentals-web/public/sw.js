/**
 * Musafir's service worker.
 *
 * Hand-written and deliberately small. A build-time toolchain (Serwist and
 * friends) buys precise precaching of every hashed asset, and costs a plugin
 * in the build that has to be understood the next time it breaks. This site is
 * six pages; what it actually needs is for a customer on a weak signal in
 * Lahore to still see something, and for a second visit to be instant.
 *
 * Two strategies, chosen by what the request is:
 *
 *   navigations   network first, cache the result, fall back to the last copy,
 *                 then to /offline. A rental price that is one day stale is
 *                 worse than a spinner, so the network always gets first go.
 *   assets        cache first. Next's build output is content-hashed, so a
 *                 cached chunk is never the wrong chunk.
 *
 * Nothing else is touched: POSTs, the API and anything cross-origin go
 * straight to the network. A booking request must never be served from a
 * cache, and an availability answer least of all.
 */
const VERSION = "musafir-v1";
const SHELL = `${VERSION}-shell`;
const RUNTIME = `${VERSION}-runtime`;

/** What must be there for the offline page to render at all. */
const SHELL_URLS = ["/offline", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll(SHELL_URLS))
      // A shell that fails to precache must not stop the worker installing,
      // the site works online regardless, and a half-installed worker is
      // harder to reason about than one with an empty cache.
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

const isAsset = (url) =>
  url.pathname.startsWith("/_next/static/") ||
  url.pathname.startsWith("/icons/") ||
  /\.(?:css|js|woff2?|png|jpe?g|svg|webp|ico)$/.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // The API is live data by definition. A cached "that car is free" is how
  // somebody books a car that went out this morning.
  if (url.pathname.startsWith("/api/")) return;
  // The office and the car owner's portal are behind a session. Neither is
  // any use offline, and a cached page from one is a page the next person on
  // that browser can open. Left entirely to the network.
  if (url.pathname.startsWith("/admin") || url.pathname.startsWith("/lender")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached ?? (await caches.match("/offline")) ?? Response.error();
        }),
    );
    return;
  }

  if (isAsset(url)) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ??
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(RUNTIME).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
  }
});
