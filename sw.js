const CACHE = "got-episode-guide-v1";

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./data.js",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./assets/hero.svg",
  "./assets/season-1.svg",
  "./assets/season-2.svg",
  "./assets/season-3.svg",
  "./assets/season-4.svg",
  "./assets/season-5.svg",
  "./assets/season-6.svg",
  "./assets/season-7.svg",
  "./assets/season-8.svg"
];

// Precache local per-episode placeholder images.
const EPISODES_PER_SEASON = { 1: 10, 2: 10, 3: 10, 4: 10, 5: 10, 6: 10, 7: 7, 8: 6 };
for (const [seasonStr, count] of Object.entries(EPISODES_PER_SEASON)) {
  const season = Number(seasonStr);
  for (let episode = 1; episode <= count; episode++) {
    ASSETS.push(`./assets/episodes/s${season}-e${episode}.svg`);
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => (k === CACHE ? null : caches.delete(k)))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
