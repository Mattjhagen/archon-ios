const { app, BrowserWindow, shell, Menu, nativeTheme } = require('electron');
const fs = require('fs');
const path = require('path');

const IDE_URL = 'https://docs.relayapp.pro/ide';
const HOME_URL = 'https://relayapp.pro';
const DEFAULT_WINDOW_BOUNDS = { width: 1440, height: 920 };

let mainWindow;

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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
