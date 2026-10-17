const CACHE = 'memora-v2';
const FILES = ['./', 'index.html', 'style.css', 'manifest.json', 'js/app.js', 'js/core.js', 'js/db.js', 'js/detect.js', 'js/detect-cv.js', 'js/export.js', 'js/github.js',
  'vendor/jspdf.umd.min.js', 'vendor/jscanify.js', 'vendor/opencv.js', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => { if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request))); });
