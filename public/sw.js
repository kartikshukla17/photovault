/* PhotoVault service worker (minimal, dependency-free).
 * - App-shell precache (offline fallback)
 * - Runtime caching for images (thumb/preview/original)
 */

const VERSION = "pv-sw-v4";
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

/* ── Share Target handler ── */
const SHARE_CACHE = "pv-share-target";

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Intercept the Web Share Target POST
  if (req.method === "POST" && url.pathname === "/share-target") {
    event.respondWith(
      (async () => {
        try {
          const formData = await req.formData();
          const files = formData.getAll("media");
          const cache = await caches.open(SHARE_CACHE);
          // Pre-clear any previous share so a failed partial write doesn't
          // leak into the next share.
          await caches.delete(SHARE_CACHE);
          const fresh = await caches.open(SHARE_CACHE);
          // Stream each file into the cache. Using file.stream() avoids
          // duplicating the file in memory when the browser's Cache backend
          // supports streamed puts (helps with large videos).
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const resp = new Response(
              typeof file.stream === "function" ? file.stream() : file,
              {
                headers: {
                  "Content-Type": file.type || "application/octet-stream",
                  "X-Filename": file.name || `shared-${i}`,
                  "X-Size": String(file.size ?? 0),
                },
              },
            );
            await fresh.put(`/share-target/file/${i}`, resp);
          }
          await fresh.put(
            "/share-target/meta",
            new Response(JSON.stringify({ count: files.length }), {
              headers: { "Content-Type": "application/json" },
            }),
          );
          return Response.redirect(`${url.origin}/share-upload`, 303);
        } catch (err) {
          // Most common causes: cache quota exceeded, SW out-of-memory while
          // parsing multipart, or an aborted upload. Surface a useful state
          // to the upload page instead of letting Chrome show ERR_FAILED.
          try {
            await caches.delete(SHARE_CACHE);
          } catch {
            /* ignore cleanup failures */
          }
          const reason =
            err && err.name === "QuotaExceededError" ? "quota" : "sw_failed";
          return Response.redirect(
            `${url.origin}/share-upload?share_error=${reason}`,
            303,
          );
        }
      })(),
    );
    return;
  }

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

