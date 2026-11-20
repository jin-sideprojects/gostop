// automatisch erzeugt (npm run build:web)
const CACHE = 'matgo-cb37a6084ac8';
const FILES = ["./","./app.js","./audio/go1.mp3","./audio/go2.mp3","./audio/go3.mp3","./audio/go4.mp3","./audio/go5.mp3","./audio/ppeok1.mp3","./audio/ppeok2.mp3","./audio/ppeok3.mp3","./audio/ppeok4.mp3","./audio/ppeok5.mp3","./audio/steal1.mp3","./audio/steal2.mp3","./audio/steal3.mp3","./audio/steal4.mp3","./audio/stop.mp3","./cards-svg.js","./commentary.js","./config.js","./effects.js","./i18n.de.js","./i18n.en.js","./i18n.js","./i18n.ko.js","./icons/icon-192.png","./icons/icon-512.png","./index.html","./manifest.webmanifest","./net.js","./regeln.de.html","./rules.en.html","./rules.ko.html","./scenes.js","./server/bot.js","./server/hub.js","./server/room.js","./sound.js","./src/engine/cards.js","./src/engine/game.js","./src/engine/rng.js","./src/engine/rules-config.js","./src/engine/score.js","./src/engine/settle.js","./src/engine/view.js","./style.css","./vendor/peerjs.min.js","./voice.js"];
self.addEventListener('install', (e) => {
  // cache: 'reload' – am HTTP-Cache des Browsers vorbei, sonst kämen alte Dateien in den neuen Speicher
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// zuerst aus dem Speicher (funktioniert ohne Internet), sonst aus dem Netz
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request)));
});
