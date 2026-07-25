/* Archon Docs — Collapsible Sidebar Submenus */
(function() {
  var STORAGE_KEY = 'archon-sidebar-collapsed';

  function getCollapsed() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) {
      return {};
    }
  }

  function saveCollapsed(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) { /* storage error */ }
  }

  function getGroupKey(group) {
    var title = group.querySelector('.sidebar-group-title');
    if (!title) return null;
    return title.textContent.trim().replace(/\s+/g, '-').toLowerCase();
  }

  function init() {
    var groups = document.querySelectorAll('.sidebar-group');
    var collapsed = getCollapsed();

    groups.forEach(function(group) {
      var title = group.querySelector('.sidebar-group-title');
      if (!title) return;

      var key = getGroupKey(group);
      if (!key) return;

      var items = group.querySelector('.sidebar-group-items');
      if (!items) {
        var links = group.querySelectorAll('.sidebar-link');
        if (links.length === 0) return;

        var wrapper = document.createElement('div');
        wrapper.className = 'sidebar-group-items';
        links.forEach(function(link) { wrapper.appendChild(link.cloneNode(true)); });
        group.innerHTML = '';
        group.appendChild(title);
        group.appendChild(wrapper);
        items = wrapper;
      }

      var chevron = document.createElement('span');
      chevron.className = 'chevron';
      chevron.textContent = '▾';
      title.appendChild(chevron);

      if (collapsed[key]) {
        group.classList.add('collapsed');
      }

      title.addEventListener('click', function(e) {
        e.preventDefault();
        var isCollapsed = group.classList.toggle('collapsed');
        collapsed[key] = isCollapsed;
        saveCollapsed(collapsed);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
