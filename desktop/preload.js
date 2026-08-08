const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true
});

contextBridge.exposeInMainWorld('archonLocal', {
  chooseWorkspace: () => ipcRenderer.invoke('workspace:choose'),
  getTree: () => ipcRenderer.invoke('workspace:tree'),
  readFile: (relativePath) => ipcRenderer.invoke('workspace:read', relativePath),
  writeFile: (relativePath, content) => ipcRenderer.invoke('workspace:write', relativePath, content),
  makeDirectory: (relativePath) => ipcRenderer.invoke('workspace:mkdir', relativePath),
  runCommand: (command) => ipcRenderer.invoke('terminal:run', command),
  onWorkspaceSelected: (callback) => ipcRenderer.on('workspace:selected', (_event, workspace) => callback(workspace))
});
