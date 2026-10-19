// Bump CACHE on every release so installed copies pick up new files.
const CACHE = "hushallskassan-v14";
const SHELL = [
  "./",
  "index.html",
  "style.css",
  "ui.js",
  "app.js",
  "rules.js",
  "bostad.js",
  "sambo.js",
  "sparande.js",
  "bil.js",
  "barn.js",
  "kopbeslut.js",
  "overenskommelser.js",
  "resor.js",
  "djur.js",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network first with a timeout so a bad connection falls back to the cache instead of hanging.
// Only successful same-origin responses are cached. The offline page fallback is for navigations only.
const NETWORK_TIMEOUT_MS = 4000;

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    new Promise((resolve) => {
      let settled = false;
      const fromCache = () =>
        caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === "navigate" ? caches.match("index.html") : null) || Response.error());
      const timer = setTimeout(() => {
        if (!settled) { settled = true; fromCache().then(resolve); }
      }, NETWORK_TIMEOUT_MS);
      fetch(req)
        .then((res) => {
          clearTimeout(timer);
          if (res.ok && res.status === 200 && res.type === "basic") {
            // Key by path only, so query-string variants do not multiply cache entries.
            const copy = res.clone();
            const url = new URL(req.url);
            const key = new Request(url.origin + url.pathname);
            e.waitUntil(caches.open(CACHE).then((c) => c.put(key, copy)).catch(() => {}));
          }
          if (!settled) { settled = true; resolve(res); }
        })
        .catch(() => {
          clearTimeout(timer);
          if (!settled) { settled = true; fromCache().then(resolve); }
        });
    })
  );
});
