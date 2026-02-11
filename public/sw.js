/* PhotoVault service worker (minimal, dependency-free).
 * - App-shell precache (offline fallback)
 * - Runtime caching for images (thumb/preview/original)
 */

const VERSION = "pv-sw-v1";
const APP_CACHE = `${VERSION}:app`;
const IMG_CACHE = `${VERSION}:img`;

const APP_SHELL_URLS = ["/offline", "/gallery", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(APP_CACHE);
      await cache.addAll(APP_SHELL_URLS);
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !k.startsWith(VERSION))
          .map((k) => caches.delete(k)),
      );
      self.clients.claim();
    })(),
  );
});

async function limitCacheEntries(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  const extra = keys.length - maxEntries;
  for (let i = 0; i < extra; i++) {
    await cache.delete(keys[i]);
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== "GET") return;
  if (url.pathname.startsWith("/api/")) return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          const cache = await caches.open(APP_CACHE);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cached = await caches.match(req);
          return cached || (await caches.match("/offline")) || Response.error();
        }
      })(),
    );
    return;
  }

  const destination = req.destination;
  const isImage =
    destination === "image" ||
    /\.(png|jpg|jpeg|webp|avif|gif|svg)$/i.test(url.pathname);

  if (isImage) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMG_CACHE);
        const cached = await cache.match(req, { ignoreSearch: false });

        const fetchPromise = fetch(req)
          .then((res) => {
            cache.put(req, res.clone());
            limitCacheEntries(IMG_CACHE, 220);
            return res;
          })
          .catch(() => cached);

        return cached || fetchPromise || Response.error();
      })(),
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const res = await fetch(req);
        const cache = await caches.open(APP_CACHE);
        cache.put(req, res.clone());
        return res;
      })(),
    );
  }
});

