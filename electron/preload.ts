import { contextBridge, ipcRenderer, webUtils } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getPathForFile: (file: File) => {
    try {
      return webUtils?.getPathForFile ? webUtils.getPathForFile(file) : (file as any).path || '';
    } catch {
      return (file as any).path || '';
    }
  },
  openFileDialog: (options?: { multiple?: boolean; filters?: { name: string; extensions: string[] }[] }) =>
    ipcRenderer.invoke('dialog:openFile', options),
  openDirectoryDialog: () => 
    ipcRenderer.invoke('dialog:openDirectory'),
  saveFileDialog: (options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) =>
    ipcRenderer.invoke('dialog:saveFile', options),
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, buffer: ArrayBuffer) => ipcRenderer.invoke('fs:writeFile', filePath, buffer),
  listPdfsInDirectory: (dirPath: string) => ipcRenderer.invoke('fs:listPdfsInDirectory', dirPath),
  showItemInFolder: (filePath: string) => ipcRenderer.invoke('shell:showItemInFolder', filePath),
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  
  // File association & external open
  getInitialFile: () => ipcRenderer.invoke('app:getInitialFile'),
  onOpenFileExternal: (callback: (filePath: string) => void) => {
    const subscription = (_: any, filePath: string) => callback(filePath);
    ipcRenderer.on('app:openFileExternal', subscription);
    return () => ipcRenderer.removeListener('app:openFileExternal', subscription);
  },

  // JumpList / External tool launcher
  getInitialTool: () => ipcRenderer.invoke('app:getInitialTool'),
  onOpenToolExternal: (callback: (toolId: string) => void) => {
    const subscription = (_: any, toolId: string) => callback(toolId);
    ipcRenderer.on('app:openToolExternal', subscription);
    return () => ipcRenderer.removeListener('app:openToolExternal', subscription);
  },

  // Taskbar native progress (0.0 to 1.0, or -1 to disable)
  setProgressBar: (progress: number) => ipcRenderer.send('window:setProgressBar', progress),

  // Auto-updater
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  downloadUpdate: () => ipcRenderer.invoke('updater:download'),
  quitAndInstallUpdate: () => ipcRenderer.invoke('updater:quitAndInstall'),
  onUpdaterStatus: (callback: (data: any) => void) => {
    const subscription = (_: any, data: any) => callback(data);
    ipcRenderer.on('updater:status', subscription);
    return () => ipcRenderer.removeListener('updater:status', subscription);
  }
});
