// automatisch erzeugt (npm run build:web)
const CACHE = 'matgo-c2de1ec5ce67';
const FILES = ["./","./app.js","./cards-svg.js","./commentary.js","./config.js","./effects.js","./i18n.de.js","./i18n.en.js","./i18n.js","./i18n.ko.js","./icons/icon-192.png","./icons/icon-512.png","./index.html","./manifest.webmanifest","./net.js","./regeln.de.html","./rules.en.html","./rules.ko.html","./scenes.js","./server/bot.js","./server/hub.js","./server/room.js","./sound.js","./src/engine/cards.js","./src/engine/game.js","./src/engine/rng.js","./src/engine/rules-config.js","./src/engine/score.js","./src/engine/settle.js","./src/engine/view.js","./style.css","./vendor/peerjs.min.js","./voice.js"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// zuerst aus dem Speicher (funktioniert ohne Internet), sonst aus dem Netz
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
