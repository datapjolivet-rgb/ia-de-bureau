// Application installable : ce « service worker » garde le jeu sur l'appareil.
// - La page passe d'abord par le réseau (on reçoit toujours la dernière version quand on est connecté) ;
//   sans réseau, ou s'il tarde trop, on reprend la copie gardée : le jeu solo marche hors ligne.
// - Les scripts portent un numéro de version (?v=…) : on les garde tels quels.
// - Les polices d'écriture (Google Fonts) sont gardées après le premier chargement.
// - Le serveur de jeu (/api, /ws) n'est jamais mis en cache.
// build.js y inscrit la version et la liste des fichiers à chaque publication.
const VERSION = '__VERSION__';
const FILES = __FILES__;
const CACHE = 'valdorne-' + VERSION;
const FONTS = 'valdorne-polices';
const WAIT = 3500; // au-delà, on montre la copie gardée (réseau très lent)

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('valdorne-') && k !== CACHE && k !== FONTS).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

function page(req) {
  const net = fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put('/', copy)); }
    return res;
  });
  return new Promise((resolve) => {
    let done = false;
    const finish = (r) => { if (!done && r) { done = true; resolve(r); } return !!r; };
    const saved = () => caches.match('/', { cacheName: CACHE }).then((r) => r || caches.match('/'));
    const timer = setTimeout(() => saved().then(finish), WAIT);
    net.then((res) => { clearTimeout(timer); finish(res); })
      .catch(() => { clearTimeout(timer); saved().then((r) => finish(r || Response.error())); });
  });
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.pathname === '/ws' || url.pathname.startsWith('/api/') || url.pathname === '/sw.js') return;
    if (req.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html') { e.respondWith(page(req)); return; }
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then((res) => {
      if (res.ok && url.searchParams.has('v')) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then((c) => c.match(req).then((r) => {
      const net = fetch(req).then((res) => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; });
      if (r) { net.catch(() => {}); return r; }
      return net;
    })));
  }
});
