// Service Worker for Nihongo Guild PWA
const CACHE_NAME = "nihongo-guild-v21";
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/style.css",
  "./js/app.js",
  "./js/furigana.js",
  "./js/avatar.js",
  "./js/battle_fx.js",
  "./js/speech_eval.js",
  "./js/handwriting.js",
  "./js/listening_reading.js",
  "./js/battle.js",
  "./js/srs.js",
  "./js/shiori_ai.js",
  "./js/sync.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./assets/shiori_normal.jpg",
  "./assets/shiori_happy.jpg",
  "./assets/shiori_shy.jpg",
  "./assets/guild_bg.jpg",
  "./assets/monster_slime.jpg",
  "./assets/monster_golem.jpg",
  "./assets/monster_dragon.jpg",
  "./assets/monster_demon_king.jpg",
  "./data/kana.json",
  "./data/kanji.json",
  "./data/vocab.json",
  "./data/grammar.json",
  "./data/schedule_398days.json",
  "./data/monsters.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching static assets...");
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("[Service Worker] Some assets failed to cache:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // 只攔截同源的 GET 請求
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // 對於 /data/ 資料集，採用網路優先策略 (Network First, Cache Fallback)，且安全寫入快取
  if (event.request.url.includes("/data/")) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const resClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, resClone).catch(() => {});
            }).catch(() => {});
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 其餘靜態資源採用快取優先 (Cache First, Network Fallback)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, resClone).catch(() => {});
          }).catch(() => {});
        }
        return networkResponse;
      });
    })
  );
});
