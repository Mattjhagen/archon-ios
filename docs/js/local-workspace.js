/* Native-only workspace bridge. The web IDE remains a browser preview; real local
   files and terminal access are exposed only by Electron's narrow preload API. */
(() => {
  const local = window.archonLocal;
  if (!local) return;

  let activePath = null;
  let activeName = null;
  let workspaceName = null;
  const explorer = document.getElementById('explorer-tree');
  const editor = document.getElementById('code-editor');
  const saveButton = document.getElementById('btn-save');
  const terminalOutput = document.getElementById('terminal-output');

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
  }

  function printTerminal(text, className = '') {
    const row = document.createElement('div');
    row.className = `term-line ${className}`;
    row.textContent = text;
    terminalOutput.appendChild(row);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  }

  function setWorkspaceStatus(name) {
    workspaceName = name || null;
    document.getElementById('status-platform').textContent = name ? `⟁ ${name}` : '⟁ Archon IDE';
    const agent = document.getElementById('agent-header');
    if (agent) agent.title = 'Local workspace tools are ready. AI model execution requires a connected provider.';
  }

  function renderTree(nodes) {
    const list = (items) => items.map((node) => {
      if (node.type === 'directory') return `<div class="tree-folder"><div class="tree-item folder"><span class="tree-icon">▾</span>${escapeHtml(node.name)}</div>${list(node.children || [])}</div>`;
      return `<div class="tree-item file" data-local-path="${escapeHtml(node.path)}"><span class="tree-icon">⌑</span>${escapeHtml(node.name)}</div>`;
    }).join('');
    explorer.innerHTML = `<div class="tree-root"><div class="tree-item folder root"><span class="tree-icon">▾</span>${escapeHtml(workspaceName || 'Local workspace')}</div>${list(nodes)}</div>`;
    explorer.querySelectorAll('[data-local-path]').forEach((element) => element.addEventListener('click', () => openFile(element.dataset.localPath)));
  }

  async function refreshTree() {
    const workspace = await local.getTree();
    if (workspace.name) setWorkspaceStatus(workspace.name);
    renderTree(workspace.tree || []);
  }

  async function openFile(filePath) {
    try {
      const content = await local.readFile(filePath);
      activePath = filePath;
      activeName = filePath.split('/').pop();
      editor.value = content;
      document.getElementById('status-lang').textContent = activeName;
      document.getElementById('editor-tabs').innerHTML = `<div class="editor-tab active">${escapeHtml(activeName)} <span class="tab-close">×</span></div>`;
    } catch (error) {
      printTerminal(`Unable to open ${filePath}: ${error.message}`, 'error');
    }
  }

  async function saveFile() {
    if (!activePath) return printTerminal('Open a file before saving.', 'error');
    try {
      await local.writeFile(activePath, editor.value);
      printTerminal(`Saved ${activePath}`, 'success');
    } catch (error) {
      printTerminal(`Unable to save: ${error.message}`, 'error');
    }
  }

  async function chooseFolder() {
    const workspace = await local.chooseWorkspace();
    if (workspace.canceled) return;
    setWorkspaceStatus(workspace.name);
    renderTree(workspace.tree || []);
    activePath = null;
    editor.value = '';
    printTerminal(`Opened local workspace: ${workspace.name}`, 'success');
  }

  function replaceTerminalInput() {
    const oldInput = document.getElementById('term-input');
    const input = oldInput.cloneNode(true);
    oldInput.replaceWith(input);
    input.addEventListener('keydown', async (event) => {
      if (event.key !== 'Enter') return;
      const command = input.value.trim();
      if (!command) return;
      input.value = '';
      printTerminal(`${workspaceName || 'workspace'} $ ${command}`, 'command');
      try {
        const result = await local.runCommand(command);
        if (result.output) printTerminal(result.output);
        if (!result.canceled) printTerminal(`Exit code: ${result.exitCode}`, result.exitCode === 0 ? 'success' : 'error');
      } catch (error) {
        printTerminal(`Command failed: ${error.message}`, 'error');
      }
    });
  }

  function replaceAiInput() {
    const send = document.getElementById('ai-send');
    const replacement = send.cloneNode(true);
    send.replaceWith(replacement);
    replacement.addEventListener('click', () => {
      const input = document.getElementById('ai-input');
      if (!input.value.trim()) return;
      input.value = '';
      printTerminal('The native workspace can now read, write, and run approved commands. AI tool execution will be enabled after a provider-backed agent is connected.', 'error');
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const newFileButton = document.getElementById('btn-new-file');
    const newFolderButton = document.getElementById('btn-new-folder');
    const toolbar = document.querySelector('.ide-toolbar');
    const open = document.createElement('button');
    open.className = 'ide-btn';
    open.textContent = 'Open Folder';
    open.addEventListener('click', chooseFolder);
    toolbar.prepend(open);
    saveButton.addEventListener('click', (event) => { event.stopImmediatePropagation(); saveFile(); }, true);
    newFileButton.addEventListener('click', (event) => { event.stopImmediatePropagation(); printTerminal('Create a file from your folder, then refresh or reopen it. Native file creation is next.', 'error'); }, true);
    newFolderButton.addEventListener('click', (event) => { event.stopImmediatePropagation(); printTerminal('Create a folder from your file manager, then refresh or reopen it. Native folder creation is next.', 'error'); }, true);
    replaceTerminalInput();
    replaceAiInput();
    local.onWorkspaceSelected((workspace) => {
      if (!workspace || workspace.canceled) return;
      setWorkspaceStatus(workspace.name);
      renderTree(workspace.tree || []);
    });
    printTerminal('Native local workspace tools are available. Use Open Folder to begin.', 'success');
  });
})();
