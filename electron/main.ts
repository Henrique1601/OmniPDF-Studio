import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { autoUpdater } from 'electron-updater';

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null;

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

// Configure autoUpdater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function setupAutoUpdater() {
  autoUpdater.on('checking-for-update', () => {
    win?.webContents.send('updater:status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    win?.webContents.send('updater:status', { 
      status: 'available', 
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes 
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    win?.webContents.send('updater:status', { status: 'not-available', version: info?.version });
  });

  autoUpdater.on('error', (err) => {
    win?.webContents.send('updater:status', { status: 'error', error: err.message });
  });

  autoUpdater.on('download-progress', (progressObj) => {
    win?.webContents.send('updater:status', { 
      status: 'downloading', 
      percent: Math.round(progressObj.percent),
      bytesPerSecond: progressObj.bytesPerSecond
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    win?.webContents.send('updater:status', { status: 'downloaded', version: info.version });
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1300,
    height: 870,
    minWidth: 960,
    minHeight: 680,
    title: 'OmniPDF Studio - Suíte Completa de PDF',
    backgroundColor: '#090d16',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST, 'index.html'));
  }

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  setupAutoUpdater();
}

// IPC Handlers
ipcMain.handle('dialog:openFile', async (_, options?: { multiple?: boolean; filters?: { name: string; extensions: string[] }[] }) => {
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: [
      'openFile',
      ...(options?.multiple ? (['multiSelections'] as const) : []),
    ],
    filters: options?.filters || [{ name: 'Documentos PDF', extensions: ['pdf'] }],
  });

  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths;
});

ipcMain.handle('dialog:openDirectory', async () => {
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
  });

  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('dialog:saveFile', async (_, options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => {
  if (!win) return null;
  const result = await dialog.showSaveDialog(win, {
    defaultPath: options?.defaultPath || 'documento.pdf',
    filters: options?.filters || [{ name: 'Documento PDF', extensions: ['pdf'] }],
  });

  if (result.canceled || !result.filePath) return null;
  return result.filePath;
});

ipcMain.handle('fs:readFile', async (_, filePath: string) => {
  try {
    const buffer = await fs.readFile(filePath);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  } catch (err: any) {
    console.error('Failed to read file:', err);
    throw new Error(`Erro ao ler arquivo: ${err.message}`);
  }
});

ipcMain.handle('fs:writeFile', async (_, filePath: string, arrayBuffer: ArrayBuffer) => {
  try {
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);
    return true;
  } catch (err: any) {
    console.error('Failed to write file:', err);
    throw new Error(`Erro ao salvar arquivo: ${err.message}`);
  }
});

ipcMain.handle('fs:listPdfsInDirectory', async (_, dirPath: string) => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const pdfFiles: { name: string; path: string; size: number }[] = [];

    for (const entry of entries) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
        const fullPath = path.join(dirPath, entry.name);
        const stats = await fs.stat(fullPath);
        pdfFiles.push({
          name: entry.name,
          path: fullPath,
          size: stats.size,
        });
      }
    }
    return pdfFiles;
  } catch (err: any) {
    console.error('Failed to list PDFs in dir:', err);
    throw new Error(`Erro ao listar pasta: ${err.message}`);
  }
});

ipcMain.handle('shell:showItemInFolder', async (_, filePath: string) => {
  shell.showItemInFolder(filePath);
  return true;
});

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

// Updater handlers
ipcMain.handle('updater:check', async () => {
  try {
    if (!app.isPackaged) {
      return { status: 'dev-mode', message: 'Verificação de update desativada em modo dev' };
    }
    return await autoUpdater.checkForUpdates();
  } catch (err: any) {
    return { status: 'error', error: err.message };
  }
});

ipcMain.handle('updater:download', async () => {
  try {
    await autoUpdater.downloadUpdate();
    return true;
  } catch (err: any) {
    throw new Error(`Erro ao baixar atualização: ${err.message}`);
  }
});

ipcMain.handle('updater:quitAndInstall', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.on('window:minimize', () => {
  win?.minimize();
});

ipcMain.on('window:maximize', () => {
  if (win?.isMaximized()) {
    win.unmaximize();
  } else {
    win?.maximize();
  }
});

ipcMain.on('window:close', () => {
  win?.close();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);
