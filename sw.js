/* BlueCalc service worker: app shell stays on the device (works offline);
   rule pages are kept after first view or after "Save all pages offline". */
const SHELL = 'bluecalc-shell-de5ace68ca';
const PDF = 'bluecalc-pdf';
const CORE = ['./', './index.html', './manifest.webmanifest', './apple-touch-icon.png', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== SHELL && k !== PDF).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.includes('/pdf/')) {            // rule pages: from the device first, keep a copy
    e.respondWith(caches.open(PDF).then(async c => {
      const hit = await c.match(req, {ignoreSearch: true});
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }
  // app files: open instantly from the device, refresh the stored copy in the background
  e.respondWith(caches.open(SHELL).then(async c => {
    const hit = await c.match(req, {ignoreSearch: true}) || (req.mode === 'navigate' ? await c.match('./index.html') : null);
    const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => null);
    return hit || (await net) || new Response('Offline', {status: 503});
  }));
});
