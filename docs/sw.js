/* Archon Docs — Service Worker */
var CACHE_NAME = 'archon-docs-v1';
var PRECACHE = [
  '/',
  '/index.html',
  '/css/docs.css',
  '/css/chat-widget.css',
  '/css/status.css',
  '/js/docs.js',
  '/js/sidebar.js',
  '/js/chat-widget.js',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png'
];

// Install — precache core assets
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(PRECACHE);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(n) { return n !== CACHE_NAME; })
             .map(function(n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

// Fetch — network first, cache fallback
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function(response) {
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function(cache) {
        cache.put(e.request, clone);
      });
      return response;
    }).catch(function() {
      return caches.match(e.request);
    })
  );
});

// Push notifications
self.addEventListener('push', function(e) {
  var data = { title: 'Archon', body: 'New update available', url: '/' };
  if (e.data) {
    try { data = Object.assign(data, e.data.json()); } catch (err) {}
  }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
      data: { url: data.url },
      actions: [
        { action: 'open', title: 'Open', url: data.url },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    })
  );
});

// Notification click
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  if (e.action === 'dismiss') return;
  var url = e.notification.data.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var c = clientList[i];
        if (c.url.includes(self.location.origin) && 'focus' in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
