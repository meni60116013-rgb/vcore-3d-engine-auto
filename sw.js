const CACHE_NAME = "vcore-cad-v4";
const CORE_ASSETS = ["./", "./index.html", "./manifest.json", "./src/geometryEngine.js"];
const TRUSTED_CDN_ORIGIN = "https://unpkg.com";
const TRUSTED_CDN_PREFIX = "/three@0.160.0/";

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith("vcore-cad-") && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;
  const trustedCdn = url.origin === TRUSTED_CDN_ORIGIN && url.pathname.startsWith(TRUSTED_CDN_PREFIX);
  if (!sameOrigin && !trustedCdn) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response.ok && (sameOrigin || response.type === "cors")) {
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      return (await cache.match(request)) || Response.error();
    }
  })());
});
