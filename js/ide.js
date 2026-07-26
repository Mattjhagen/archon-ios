// Archon IDE — Lightweight Browser IDE
(function() {
  'use strict';

  // State
  const state = {
    files: {},
    openFiles: [],
    activeFile: null,
    platform: 'web',
    modified: new Set()
  };

  // DOM refs
  const $ = id => document.getElementById(id);
  const editor = $('code-editor');
  const tabs = $('editor-tabs');
  const tree = $('explorer-tree');
  const lineNumbers = $('line-numbers');
  const welcome = $('editor-welcome');
  const previewFrame = $('preview-frame');
  const previewArea = $('preview-area');
  const outputArea = $('output-area');
  const outputBody = $('output-body');
  const termInput = $('term-input');
  const termBody = $('terminal-body');
  const aiInput = $('ai-input');
  const aiMessages = $('ai-messages');
  const explorerTitle = $('explorer-title');
  const statusLang = $('status-lang');
  const statusFileCount = $('status-file-count');
  const statusCursor = $('status-cursor');

  // Helpers
  function ext(name) {
    const m = name.match(/\.(\w+)$/);
    return m ? m[1].toLowerCase() : '';
  }

  function langForFile(name) {
    const e = ext(name);
    const map = {
      js: 'JavaScript', ts: 'TypeScript', tsx: 'TypeScript', jsx: 'JavaScript',
      html: 'HTML', css: 'CSS', json: 'JSON', swift: 'Swift',
      py: 'Python', kt: 'Kotlin', java: 'Java', md: 'Markdown',
      sh: 'Shell', yml: 'YAML', yaml: 'YAML', toml: 'TOML',
      xml: 'XML', svg: 'SVG', png: 'Image', jpg: 'Image', jpeg: 'Image',
      gif: 'Image', webp: 'Image'
    };
    return map[e] || 'Text';
  }

  function iconForFile(name) {
    const e = ext(name);
    const map = {
      js: '\u{1F7E1}', ts: '\u{1F535}', tsx: '\u{1F535}', jsx: '\u{1F7E1}',
      html: '\u{1F310}', css: '\u{1F3A8}', json: '\u{1F4CB}',
      swift: '\u{1F7E5}', py: '\u{1F40D}', kt: '\u{1F3F4}',
      md: '\u{1F4DD}', sh: '\u{1F4E6}', yml: '\u{2699}\uFE0F',
      png: '\u{1F5BC}', jpg: '\u{1F5BC}', svg: '\u{1F5BC}'
    };
    return map[e] || '\u{1F4C4}';
  }

  function isBinary(name) {
    return ['png','jpg','jpeg','gif','webp','ico','woff','woff2','ttf','eot'].includes(ext(name));
  }

  // File tree
  function renderTree() {
    tree.innerHTML = '';
    const paths = Object.keys(state.files).sort();
    const dirs = new Set();
    paths.forEach(p => {
      const parts = p.split('/');
      for (let i = 1; i < parts.length; i++) {
        dirs.add(parts.slice(0, i).join('/'));
      }
    });

    function addNode(path, depth) {
      const name = path.split('/').pop();
      const isDir = dirs.has(path);
      const item = document.createElement('div');
      item.className = 'tree-item' + (isDir ? ' folder' : '') +
        (state.activeFile === path ? ' active' : '');
      item.dataset.depth = depth;
      item.dataset.path = path;

      if (isDir) {
        item.innerHTML = '<span class="chevron">\u25B6</span>' +
          '<span class="icon">\u{1F4C1}</span>' + name;
        item.addEventListener('click', () => {
          item.classList.toggle('open');
          const children = tree.querySelectorAll(`[data-parent="${path}"]`);
          children.forEach(c => c.style.display =
            c.style.display === 'none' ? 'flex' : 'none');
        });
      } else {
        item.innerHTML = '<span class="chevron"></span>' +
          '<span class="icon">' + iconForFile(name) + '</span>' + name;
        item.addEventListener('click', () => openFile(path));
      }
      tree.appendChild(item);
    }

    // Root dirs first
    const rootDirs = new Set();
    paths.forEach(p => {
      const root = p.split('/')[0];
      rootDirs.add(root);
    });
    [...rootDirs].sort().forEach(d => {
      addNode(d, 0);
      // Children
      paths.filter(p => p.startsWith(d + '/') && !p.slice(d.length + 1).includes('/'))
        .forEach(p => addNode(p, 1));
    });
  }

  // Editor
  function openFile(path) {
    if (isBinary(path)) return;
    const content = state.files[path] || '';
    if (!state.openFiles.includes(path)) {
      state.openFiles.push(path);
    }
    state.activeFile = path;
    editor.value = content;
    welcome.style.display = 'none';
    editor.style.display = 'block';
    lineNumbers.style.display = 'block';
    updateTabs();
    updateLineNumbers();
    updateStatus();
    renderTree();
  }

  function closeFile(path) {
    state.openFiles = state.openFiles.filter(f => f !== path);
    if (state.activeFile === path) {
      if (state.openFiles.length > 0) {
        openFile(state.openFiles[state.openFiles.length - 1]);
      } else {
        state.activeFile = null;
        editor.style.display = 'none';
        lineNumbers.style.display = 'none';
        welcome.style.display = 'flex';
        updateTabs();
      }
    } else {
      updateTabs();
    }
  }

  function updateTabs() {
    tabs.innerHTML = '';
    state.openFiles.forEach(path => {
      const name = path.split('/').pop();
      const tab = document.createElement('button');
      tab.className = 'ide-editor-tab' + (path === state.activeFile ? ' active' : '');
      tab.innerHTML = iconForFile(name) + ' ' + name +
        (state.modified.has(path) ? ' \u25CF' : '') +
        '<span class="close">\u00D7</span>';
      tab.addEventListener('click', e => {
        if (e.target.classList.contains('close')) {
          closeFile(path);
        } else {
          openFile(path);
        }
      });
      tabs.appendChild(tab);
    });
  }

  function updateLineNumbers() {
    const lines = (editor.value || '').split('\n').length;
    let html = '';
    for (let i = 1; i <= lines; i++) {
      html += i + '\n';
    }
    lineNumbers.textContent = html;
  }

  function updateStatus() {
    if (state.activeFile) {
      statusLang.textContent = state.platform.charAt(0).toUpperCase() +
        state.platform.slice(1) + ' \u00B7 ' + langForFile(state.activeFile);
    }
    statusFileCount.textContent = Object.keys(state.files).length + ' files';
  }

  // Editor events
  if (editor) {
    editor.addEventListener('input', () => {
      if (state.activeFile) {
        state.files[state.activeFile] = editor.value;
        state.modified.add(state.activeFile);
        updateLineNumbers();
        updateTabs();
      }
    });
    editor.addEventListener('scroll', () => {
      lineNumbers.scrollTop = editor.scrollTop;
    });
    editor.addEventListener('keydown', e => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.value = editor.value.substring(0, start) + '  ' +
          editor.value.substring(end);
        editor.selectionStart = editor.selectionEnd = start + 2;
        editor.dispatchEvent(new Event('input'));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
      }
    });
  }

  function saveFile() {
    if (state.activeFile) {
      state.modified.delete(state.activeFile);
      updateTabs();
      termPrint('Saved ' + state.activeFile, 'success');
    }
  }

  // Terminal
  function termPrint(text, cls) {
    const line = document.createElement('div');
    line.className = 'term-line';
    line.innerHTML = '<span class="term-prompt">\u276F</span>' +
      '<span class="term-' + (cls || 'output') + '">' + text + '</span>';
    termBody.appendChild(line);
    termBody.scrollTop = termBody.scrollHeight;
  }

  if (termInput) {
    termInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const cmd = termInput.value.trim();
        if (!cmd) return;
        termPrint('<span class="term-cmd">' + cmd + '</span>');
        termInput.value = '';

        // Simple command handlers
        if (cmd === 'ls') {
          Object.keys(state.files).sort().forEach(f => termPrint(f));
        } else if (cmd.startsWith('cat ')) {
          const path = cmd.slice(4).trim();
          if (state.files[path]) {
            termPrint(state.files[path]);
          } else {
            termPrint('File not found: ' + path, 'error');
          }
        } else if (cmd === 'help') {
          termPrint('Commands: ls, cat <file>, clear, help');
        } else if (cmd === 'clear') {
          termBody.innerHTML = '';
          termBody.appendChild(
            Object.assign(document.createElement('div'), { className: 'term-input-line' })
          );
        } else {
          termPrint('Command not found: ' + cmd.split(' ')[0], 'error');
        }
      }
    });
  }

  // Platform switcher
  document.querySelectorAll('.platform-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.platform-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.platform = btn.dataset.platform;
      const labels = {
        web: 'Web \u00B7 HTML/CSS/JS',
        ios: 'iOS \u00B7 Swift/SwiftUI',
        android: 'Android \u00B7 Kotlin/Compose',
        react: 'React Native \u00B7 JS/TS',
        mac: 'macOS \u00B7 Swift/AppKit'
      };
      statusLang.textContent = labels[state.platform] || state.platform;
      if (explorerTitle) {
        explorerTitle.textContent = 'Explorer \u2014 ' +
          state.platform.charAt(0).toUpperCase() + state.platform.slice(1);
      }
    });
  });

  // View switching
  document.querySelectorAll('.ide-topbar-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ide-topbar-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const view = tab.dataset.view;
      const editorContent = $('editor-content');
      if (view === 'editor') {
        editorContent.style.display = 'flex';
        previewArea.style.display = 'none';
        outputArea.style.display = 'none';
      } else if (view === 'preview') {
        editorContent.style.display = 'none';
        previewArea.style.display = 'flex';
        outputArea.style.display = 'none';
      } else if (view === 'output') {
        editorContent.style.display = 'none';
        previewArea.style.display = 'none';
        outputArea.style.display = 'block';
      }
    });
  });

  // AI Chat
  function addAiMessage(text, role) {
    const msg = document.createElement('div');
    msg.className = 'ai-msg ' + role;
    msg.textContent = text;
    aiMessages.appendChild(msg);
    aiMessages.scrollTop = aiMessages.scrollHeight;
  }

  if (aiInput) {
    aiInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = aiInput.value.trim();
        if (!text) return;
        addAiMessage(text, 'user');
        aiInput.value = '';
        setTimeout(() => {
          addAiMessage('AI responses require a backend connection. This is a frontend prototype.', 'assistant');
        }, 500);
      }
    });
  }

  // AI Suggestions
  document.querySelectorAll('.ai-suggestion').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.dataset.prompt;
      if (aiInput) {
        aiInput.value = prompt;
        aiInput.focus();
      }
    });
  });

  // Welcome hints
  document.querySelectorAll('.welcome-hint').forEach(hint => {
    hint.addEventListener('click', () => {
      if (aiInput) {
        aiInput.value = hint.dataset.hint;
        aiInput.focus();
      }
    });
  });

  // File upload via button
  const newFileBtn = $('btn-new-file');
  const newFolderBtn = $('btn-new-folder');
  const saveBtn = $('btn-save');
  const exportBtn = $('btn-export');
  const runBtn = $('btn-run');
  const treeNewFileBtn = $('btn-tree-new-file');

  function showModal(title, bodyHtml, onConfirm) {
    const overlay = $('modal-overlay');
    const modalTitle = $('modal-title');
    const modalBody = $('modal-body');
    const modalFooter = $('modal-footer');
    modalTitle.textContent = title;
    modalBody.innerHTML = bodyHtml;
    modalFooter.innerHTML =
      '<button class="btn-cancel" id="modal-cancel">Cancel</button>' +
      '<button class="btn-confirm" id="modal-confirm">OK</button>';
    overlay.style.display = 'flex';

    $('modal-cancel').onclick = () => { overlay.style.display = 'none'; };
    $('modal-confirm').onclick = () => {
      onConfirm(modalBody);
      overlay.style.display = 'none';
    };
    $('modal-close').onclick = () => { overlay.style.display = 'none'; };
    const input = modalBody.querySelector('input');
    if (input) {
      input.focus();
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          onConfirm(modalBody);
          overlay.style.display = 'none';
        }
      });
    }
  }

  if (newFileBtn) {
    newFileBtn.addEventListener('click', () => {
      showModal('New File', '<input type="text" placeholder="filename.js" id="modal-input">',
        body => {
          const name = body.querySelector('input').value.trim();
          if (name) {
            state.files[name] = '';
            renderTree();
            openFile(name);
          }
        });
    });
  }

  if (newFolderBtn) {
    newFolderBtn.addEventListener('click', () => {
      showModal('New Folder', '<input type="text" placeholder="folder-name" id="modal-input">',
        body => {
          const name = body.querySelector('input').value.trim();
          if (name) {
            state.files[name + '/.gitkeep'] = '';
            renderTree();
          }
        });
    });
  }

  if (treeNewFileBtn) {
    treeNewFileBtn.addEventListener('click', () => {
      newFileBtn.click();
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', saveFile);
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      if (typeof JSZip !== 'undefined') {
        const zip = new JSZip();
        Object.entries(state.files).forEach(([path, content]) => {
          zip.file(path, content);
        });
        zip.generateAsync({ type: 'blob' }).then(blob => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = (state.platform || 'project') + '-project.zip';
          a.click();
          URL.revokeObjectURL(url);
          termPrint('Project exported as ZIP', 'success');
        });
      } else {
        termPrint('JSZip not loaded', 'error');
      }
    });
  }

  if (runBtn) {
    runBtn.addEventListener('click', () => {
      // Build web preview from files
      const htmlFile = state.files['index.html'] ||
        state.files['src/index.html'] || '';
      const cssFile = state.files['style.css'] ||
        state.files['src/style.css'] ||
        state.files['css/style.css'] || '';
      const jsFile = state.files['script.js'] ||
        state.files['src/script.js'] ||
        state.files['js/script.js'] || '';

      if (!htmlFile && !cssFile && !jsFile) {
        termPrint('No web files to preview. Create an index.html first.', 'error');
        return;
      }

      const fullHtml = '<!DOCTYPE html><html><head><style>' +
        cssFile + '</style></head><body>' +
        htmlFile + '<script>' + jsFile + '<\/script></body></html>';

      previewFrame.srcdoc = fullHtml;

      // Switch to preview tab
      document.querySelectorAll('.ide-topbar-tab').forEach(t => t.classList.remove('active'));
      document.querySelector('.ide-topbar-tab[data-view="preview"]').classList.add('active');
      $('editor-content').style.display = 'none';
      previewArea.style.display = 'flex';
      outputArea.style.display = 'none';

      termPrint('Preview launched', 'success');
    });
  }

  // File upload via drag & drop
  function createDropZone() {
    const zone = document.createElement('div');
    zone.className = 'ide-drop-zone';
    zone.id = 'drop-zone';
    zone.innerHTML = '<div class="ide-drop-zone-icon">\u{1F4C1}</div>' +
      '<div>Drop files here to add to project</div>';
    const editorContent = $('editor-content');
    if (editorContent) {
      editorContent.appendChild(zone);
    }
    return zone;
  }

  const dropZone = createDropZone();

  function handleFileUpload(files) {
    Array.from(files).forEach(file => {
      if (isBinary(file.name)) {
        termPrint('Skipped binary file: ' + file.name, 'output');
        return;
      }
      const reader = new FileReader();
      reader.onload = e => {
        state.files[file.name] = e.target.result;
        renderTree();
        termPrint('Added: ' + file.name, 'success');
        updateStatus();
      };
      reader.readAsText(file);
    });
  }

  document.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('visible');
  });

  document.addEventListener('dragleave', e => {
    if (e.relatedTarget === null || !document.contains(e.relatedTarget)) {
      dropZone.classList.remove('visible');
    }
  });

  document.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('visible');
    if (e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  });

  // File upload via input (hidden)
  function createFileInput() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.id = 'file-upload-input';
    input.style.display = 'none';
    input.addEventListener('change', () => {
      if (input.files.length > 0) {
        handleFileUpload(input.files);
      }
      input.value = '';
    });
    document.body.appendChild(input);
    return input;
  }

  const fileInput = createFileInput();

  // Double-click on explorer to upload
  const explorerTree = $('explorer-tree');
  if (explorerTree) {
    explorerTree.addEventListener('dblclick', e => {
      if (e.target === explorerTree || e.target.classList.contains('ide-explorer-header')) {
        fileInput.click();
      }
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'N') {
      e.preventDefault();
      newFileBtn.click();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
      e.preventDefault();
      runBtn.click();
    }
  });

  // Tooltip
  const tooltip = $('tooltip');
  document.querySelectorAll('[data-tooltip]').forEach(el => {
    el.addEventListener('mouseenter', e => {
      tooltip.textContent = el.dataset.tooltip;
      tooltip.classList.add('visible');
      const rect = el.getBoundingClientRect();
      tooltip.style.left = rect.left + 'px';
      tooltip.style.top = (rect.bottom + 6) + 'px';
    });
    el.addEventListener('mouseleave', () => {
      tooltip.classList.remove('visible');
    });
  });

  // Initialize
  renderTree();
  updateStatus();
  termPrint('Archon IDE ready. Drop files or use + File to start.', 'success');

})();
