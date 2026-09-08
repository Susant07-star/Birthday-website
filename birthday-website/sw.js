const CACHE = 'bday-v3';
const ASSETS = [
  '/', '/index.html', '/css/style.css', '/js/messages.js', '/manifest.json',
  '/icons/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png', '/icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Never cache Supabase — always live data
  if (e.request.url.includes('supabase')) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

/* Push notification handler */
self.addEventListener('push', e => {
  let data = { title: '💕 A Surprise For You', body: 'Something magical is waiting...' };
  try { data = e.data.json(); } catch (err) {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: '/' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL(e.notification.data?.url || '/', self.location.origin).href;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async windows => {
      const existing = windows.find(client => client.url.startsWith(self.location.origin));
      if (existing) {
        if (existing.url !== target && 'navigate' in existing) await existing.navigate(target);
        return existing.focus();
      }
      return clients.openWindow(target);
    })
  );
});
