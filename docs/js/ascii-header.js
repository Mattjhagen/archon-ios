/* ASCII Header Animation Engine */
/* Generates stars, arc dots, and packets dynamically */

(function() {
  'use strict';

  function initAsciiHeaders() {
    document.querySelectorAll('.ascii-header-wrapper').forEach(function(wrapper) {
      var starsContainer = wrapper.querySelector('.ascii-stars');
      var arcContainer = wrapper.querySelector('.ascii-arc');
      if (!starsContainer || !arcContainer) return;

      var w = wrapper.offsetWidth;
      var h = wrapper.offsetHeight;

      // Generate stars
      var starCount = Math.floor((w * h) / 3000);
      for (var i = 0; i < starCount; i++) {
        var star = document.createElement('span');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.animationDelay = (Math.random() * 4) + 's';
        star.style.animationDuration = (3 + Math.random() * 3) + 's';
        star.textContent = Math.random() > 0.5 ? '·' : '*';
        star.style.fontSize = (8 + Math.random() * 4) + 'px';
        starsContainer.appendChild(star);
      }

      // Generate sine arc dots
      var arcStartX = w * 0.12;
      var arcEndX = w * 0.88;
      var arcSpan = arcEndX - arcStartX;
      var arcCenterY = h * 0.65;

      for (var x = arcStartX; x < arcEndX; x += 12) {
        var t = (x - arcStartX) / arcSpan;
        var y = arcCenterY - Math.sin(t * Math.PI) * 30;
        var dot = document.createElement('span');
        dot.className = 'arc-dot';
        dot.style.left = x + 'px';
        dot.style.bottom = (h - y) + 'px';
        arcContainer.appendChild(dot);
      }

      // Generate traveling packets
      var packets = [
        { cls: 'cpu',    count: 2, duration: 7,  delayOffset: 0 },
        { cls: 'ram',    count: 2, duration: 9,  delayOffset: 2 },
        { cls: 'response', count: 1, duration: 11, delayOffset: 5 }
      ];

      packets.forEach(function(group) {
        for (var p = 0; p < group.count; p++) {
          // Packet
          var pkt = document.createElement('span');
          pkt.className = 'packet ' + group.cls;
          var delay = group.delayOffset + (p * group.duration / group.count);
          var dur = group.duration + (Math.random() * 2 - 1);
          pkt.style.setProperty('--travel-duration', dur + 's');
          pkt.style.setProperty('--travel-delay', delay + 's');
          pkt.style.setProperty('--start-x', (10 + Math.random() * 3) + '%');
          pkt.style.setProperty('--end-x', (83 + Math.random() * 3) + '%');
          pkt.style.setProperty('--start-y', '55px');
          pkt.style.setProperty('--end-y', (35 + Math.random() * 15) + 'px');
          wrapper.appendChild(pkt);

          // Trail (slightly behind)
          var trail = document.createElement('span');
          trail.className = 'packet-trail ' + group.cls;
          trail.style.setProperty('--travel-duration', dur + 's');
          trail.style.setProperty('--travel-delay', (delay - 0.3) + 's');
          trail.style.setProperty('--start-x', (10 + Math.random() * 3) + '%');
          trail.style.setProperty('--end-x', (83 + Math.random() * 3) + '%');
          trail.style.setProperty('--start-y', '55px');
          trail.style.setProperty('--end-y', (35 + Math.random() * 15) + 'px');
          wrapper.appendChild(trail);
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAsciiHeaders);
  } else {
    initAsciiHeaders();
  }
})();
