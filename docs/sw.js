/* Service worker de la app Control Cosemar: permite instalarla en el celular y abrirla sin señal.
   Red primero (los datos se actualizan cada ~25 min); si no hay conexión, muestra la última copia guardada. */
const CACHE = 'cosemar-v1';
const BASE = ['./', 'index.html', 'manifest.webmanifest', 'icono-192.png', 'icono-512.png', 'js/runtime.js', 'js/motor.js', 'js/app.js', 'js/operacion.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  e.respondWith(fetch(r).then(res => { if (res.ok && (new URL(r.url).origin === location.origin || /cdnjs\.cloudflare\.com/.test(r.url))) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; })
    .catch(() => caches.match(r).then(m => m || caches.match('index.html'))));
});
