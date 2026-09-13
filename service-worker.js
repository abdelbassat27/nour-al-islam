/* Service Worker - نور الإسلام PWA */
const CACHE_NAME = 'nour-al-islam-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './manifest.json'
];

// تثبيت الـ Service Worker وتخزين الملفات الأساسية
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// تفعيل: حذف الكاشات القديمة
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// استراتيجية: Cache First للملفات المحلية، Network First للـ APIs
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // لا نخزن طلبات الـ API (القرآن والمواقيت)
  if (url.hostname.includes('alquran.cloud') || 
      url.hostname.includes('aladhan.com') ||
      url.hostname.includes('islamic.network') ||
      url.hostname.includes('cdn.')) {
    event.respondWith(fetch(event.request).catch(() => {
      return new Response(JSON.stringify({ error: 'offline' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }));
    return;
  }

  // للملفات المحلية: Cache First
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        // نخزن النسخ الجديدة
        if (response && response.status === 200 && event.request.method === 'GET') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      }).catch(() => {
        // إذا فشل كل شيء، نرجع الصفحة الرئيسية من الكاش
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
