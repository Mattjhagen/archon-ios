/* Archon Docs — PWA Initializer */
(function() {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(function() {});
  }

  // Prompt for notifications (once per session)
  if ('Notification' in window && Notification.permission === 'default') {
    var asked = sessionStorage.getItem('archon-notif-asked');
    if (!asked) {
      // Wait 30 seconds before asking
      setTimeout(function() {
        Notification.requestPermission().then(function(perm) {
          sessionStorage.setItem('archon-notif-asked', '1');
          if (perm === 'granted') {
            // Show a welcome notification
            try {
              navigator.serviceWorker.ready.then(function(reg) {
                reg.showNotification('Archon Docs', {
                  body: 'Notifications enabled! You\'ll get updates about new lessons and features.',
                  icon: '/icon-192.png',
                  badge: '/icon-192.png',
                  tag: 'welcome',
                  renotify: true
                });
              });
            } catch (e) {}
          }
        });
      }, 30000);
    }
  }

  // Add to homescreen prompt (iOS/Android)
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    // Show a subtle install banner after 60 seconds
    setTimeout(function() {
      if (!deferredPrompt) return;
      var banner = document.createElement('div');
      banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#0c0c14;border-top:1px solid #1a1a2e;padding:12px 20px;display:flex;align-items:center;gap:12px;z-index:9997;font-family:Inter,sans-serif;';
      banner.innerHTML = '<span style="flex:1;font-size:13px;color:#c8c8d8;">Add Archon to your home screen for the full app experience</span>' +
        '<button id="pwa-install-btn" style="background:#7c5cfc;color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;">Install</button>' +
        '<button id="pwa-dismiss-btn" style="background:none;border:none;color:#6a6a8a;font-size:13px;cursor:pointer;">✕</button>';
      document.body.appendChild(banner);

      document.getElementById('pwa-install-btn').addEventListener('click', function() {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function() { deferredPrompt = null; });
        banner.remove();
      });
      document.getElementById('pwa-dismiss-btn').addEventListener('click', function() {
        banner.remove();
        sessionStorage.setItem('archon-pwa-dismissed', '1');
      });
    }, 60000);
  });

  // iOS standalone detection
  if (window.navigator.standalone) {
    document.body.classList.add('pwa-standalone');
  }
})();
