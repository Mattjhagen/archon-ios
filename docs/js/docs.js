document.addEventListener('DOMContentLoaded', function() {
  // Accordion
  document.querySelectorAll('.accordion-trigger').forEach(function(trigger) {
    trigger.addEventListener('click', function() {
      var accordion = this.parentElement;
      accordion.classList.toggle('open');
    });
  });

  // Tabs
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var group = this.closest('.tab-group');
      var target = this.dataset.tab;
      group.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
      group.querySelectorAll('.tab-panel').forEach(function(p) { p.classList.remove('active'); });
      this.classList.add('active');
      group.querySelector('[data-panel="' + target + '"]').classList.add('active');
    });
  });

  // Mobile sidebar
  var toggle = document.querySelector('.mobile-toggle');
  var sidebar = document.querySelector('.sidebar');
  if (toggle && sidebar) {
    toggle.addEventListener('click', function() {
      sidebar.classList.toggle('open');
    });
    document.addEventListener('click', function(e) {
      if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== toggle) {
        sidebar.classList.remove('open');
      }
    });
  }

  // Active sidebar link
  var currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.sidebar-link').forEach(function(link) {
    var href = link.getAttribute('href').split('/').pop();
    if (href === currentPath) {
      link.classList.add('active');
    }
  });
});
