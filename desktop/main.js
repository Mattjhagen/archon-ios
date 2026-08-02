const { app, BrowserWindow, shell, Menu, ipcMain, dialog } = require('electron');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { spawn } = require('child_process');

const IDE_URL = 'https://docs.relayapp.pro/ide';
const HOME_URL = 'https://relayapp.pro';
const DEFAULT_WINDOW_BOUNDS = { width: 1440, height: 920 };

let mainWindow;
let workspaceRoot = null;

function assertTrustedSender(event) {
  if (new URL(event.senderFrame.url).origin !== new URL(IDE_URL).origin) {
    throw new Error('Local workspace access is only available to Relay Docs.');
  }
}

function isInsideWorkspace(candidate) {
  const relative = path.relative(workspaceRoot, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function resolveWorkspacePath(relativePath, { allowMissing = false } = {}) {
  if (!workspaceRoot) throw new Error('Open a local folder first.');
  if (typeof relativePath !== 'string' || path.isAbsolute(relativePath)) throw new Error('Only relative workspace paths are allowed.');

  const target = path.resolve(workspaceRoot, relativePath);
  if (!isInsideWorkspace(target)) throw new Error('That path is outside the selected folder.');

  if (allowMissing) {
    const parent = await fsp.realpath(path.dirname(target));
    if (!isInsideWorkspace(parent)) throw new Error('That path resolves outside the selected folder.');
    return target;
  }

  const realTarget = await fsp.realpath(target);
  if (!isInsideWorkspace(realTarget)) throw new Error('That path resolves outside the selected folder.');
  return realTarget;
}

async function workspaceTree(directory = workspaceRoot, relativePath = '', depth = 0) {
  if (depth > 5) return [];
  const ignored = new Set(['.git', 'node_modules', '.DS_Store']);
  const entries = await fsp.readdir(directory, { withFileTypes: true });
  const nodes = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (ignored.has(entry.name)) continue;
    const childPath = path.join(relativePath, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      nodes.push({ name: entry.name, path: childPath, type: 'directory', children: await workspaceTree(absolutePath, childPath, depth + 1) });
    } else if (entry.isFile()) {
      nodes.push({ name: entry.name, path: childPath, type: 'file' });
    }
  }
  return nodes.slice(0, 500);
}

async function chooseWorkspace() {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Open local project folder',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  workspaceRoot = await fsp.realpath(result.filePaths[0]);
  return { canceled: false, name: path.basename(workspaceRoot), tree: await workspaceTree() };
}

function registerLocalWorkspaceHandlers() {
  ipcMain.handle('workspace:choose', async (event) => { assertTrustedSender(event); return chooseWorkspace(); });
  ipcMain.handle('workspace:tree', async (event) => { assertTrustedSender(event); return { name: workspaceRoot ? path.basename(workspaceRoot) : null, tree: workspaceRoot ? await workspaceTree() : [] }; });
  ipcMain.handle('workspace:read', async (event, relativePath) => {
    assertTrustedSender(event);
    const target = await resolveWorkspacePath(relativePath);
    const stat = await fsp.stat(target);
    if (!stat.isFile()) throw new Error('That is not a file.');
    if (stat.size > 2 * 1024 * 1024) throw new Error('Files larger than 2 MB cannot be opened in the editor.');
    return fsp.readFile(target, 'utf8');
  });
  ipcMain.handle('workspace:write', async (event, relativePath, content) => {
    assertTrustedSender(event);
    if (typeof content !== 'string' || Buffer.byteLength(content, 'utf8') > 2 * 1024 * 1024) throw new Error('The file content is too large.');
    const target = await resolveWorkspacePath(relativePath, { allowMissing: true });
    await fsp.writeFile(target, content, 'utf8');
    return { path: relativePath };
  });
  ipcMain.handle('workspace:mkdir', async (event, relativePath) => {
    assertTrustedSender(event);
    const target = await resolveWorkspacePath(relativePath, { allowMissing: true });
    await fsp.mkdir(target);
    return { path: relativePath };
  });
  ipcMain.handle('terminal:run', async (event, command) => {
    assertTrustedSender(event);
    if (!workspaceRoot) throw new Error('Open a local folder first.');
    if (typeof command !== 'string' || !command.trim()) throw new Error('Enter a command first.');
    if (command.length > 4000) throw new Error('Command is too long.');
    const approval = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['Run command', 'Cancel'],
      defaultId: 1,
      cancelId: 1,
      title: 'Run local command?',
      message: command,
      detail: `Archon IDE will run this in ${workspaceRoot}. Review the command carefully; shell commands can affect files and services outside this folder.`
    });
    if (approval.response !== 0) return { canceled: true, output: 'Command cancelled.' };
    return new Promise((resolve) => {
      const child = spawn(command, {
        cwd: workspaceRoot,
        shell: process.platform === 'win32' ? process.env.ComSpec : '/bin/zsh',
        env: process.env
      });
      let output = '';
      const append = (chunk) => { output = `${output}${chunk}`.slice(-65536); };
      child.stdout.on('data', append);
      child.stderr.on('data', append);
      const timer = setTimeout(() => child.kill(), 120000);
      child.on('error', (error) => { clearTimeout(timer); resolve({ output: `${output}${error.message}`, exitCode: 1 }); });
      child.on('close', (exitCode) => { clearTimeout(timer); resolve({ output, exitCode }); });
    });
  });
}

function windowStatePath() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function loadWindowState() {
  try {
    const saved = JSON.parse(fs.readFileSync(windowStatePath(), 'utf8'));
    if (Number.isInteger(saved.width) && Number.isInteger(saved.height)) return saved;
  } catch {
    // A first launch, or an interrupted write, should simply use the default workspace size.
  }
  return DEFAULT_WINDOW_BOUNDS;
}

function saveWindowState() {
  if (!mainWindow) return;
  const bounds = mainWindow.getBounds();
  try {
    fs.writeFileSync(windowStatePath(), JSON.stringify({ ...bounds, isMaximized: mainWindow.isMaximized() }));
  } catch {
    // Closing the app should not be blocked if the user-data directory is unavailable.
  }
}

function createWindow() {
  const state = loadWindowState();
  const { isMaximized, ...windowBounds } = state;
  mainWindow = new BrowserWindow({
    ...windowBounds,
    minWidth: 900,
    minHeight: 600,
    title: 'Archon IDE',
    backgroundColor: '#06060a',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    ...(process.platform === 'darwin' ? {} : { titleBarOverlay: { color: '#06060a', symbolColor: '#d7d5df', height: 36 } }),
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    },
    icon: path.join(__dirname, 'icon.png'),
    show: false
  });

  mainWindow.loadURL(IDE_URL);

  mainWindow.once('ready-to-show', () => {
    if (isMaximized) mainWindow.maximize();
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin === new URL(IDE_URL).origin) return;
    event.preventDefault();
    shell.openExternal(url);
  });

  mainWindow.on('close', saveWindowState);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  buildMenu();
}

function buildMenu() {
  const template = [
    {
      label: 'Archon IDE',
      submenu: [
        { role: 'about', label: 'About Archon IDE' },
        { type: 'separator' },
        {
          label: 'Check for Updates...',
          click: () => shell.openExternal('https://github.com/Mattjhagen/archon-ios/releases')
        },
        { type: 'separator' },
        { role: 'hide', label: 'Hide Archon IDE' },
        { role: 'hideOthers', label: 'Hide Others' },
        { role: 'unhide', label: 'Show All' },
        { type: 'separator' },
        { role: 'quit', label: 'Quit Archon IDE' }
      ]
    },
    {
      label: 'Workspace',
      submenu: [
        { label: 'Open Local Folder...', accelerator: 'CmdOrCtrl+O', click: () => chooseWorkspace().then((workspace) => mainWindow?.webContents.send('workspace:selected', workspace)) },
        { label: 'Archon Home', accelerator: 'CmdOrCtrl+Shift+H', click: () => mainWindow?.loadURL(IDE_URL) },
        { type: 'separator' },
        { role: 'reload', label: 'Reload Workspace' },
        { role: 'forceReload', label: 'Reload Without Cache' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', label: 'Undo' },
        { role: 'redo', label: 'Redo' },
        { type: 'separator' },
        { role: 'cut', label: 'Cut' },
        { role: 'copy', label: 'Copy' },
        { role: 'paste', label: 'Paste' },
        { role: 'selectAll', label: 'Select All' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'toggleDevTools', label: 'Toggle Developer Tools' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Reset Zoom' },
        { role: 'zoomIn', label: 'Zoom In' },
        { role: 'zoomOut', label: 'Zoom Out' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Toggle Full Screen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize', label: 'Minimize' },
        { role: 'zoom', label: 'Zoom' },
        { type: 'separator' },
        { role: 'front', label: 'Bring All to Front' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () => shell.openExternal('https://docs.relayapp.pro')
        },
        {
          label: 'Report Issue',
          click: () => shell.openExternal('https://github.com/Mattjhagen/archon-ios/issues')
        },
        {
          label: 'Relay Homepage',
          click: () => shell.openExternal(HOME_URL)
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(() => {
  registerLocalWorkspaceHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
