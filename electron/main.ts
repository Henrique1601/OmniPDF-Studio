import { app, BrowserWindow, ipcMain, dialog, shell, session } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import { autoUpdater } from 'electron-updater';

process.env.DIST = path.join(__dirname, '../dist');
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../public');

let win: BrowserWindow | null = null;
let initialPdfPath: string | null = null;
let initialToolId: string | null = null;

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

// Extract PDF path from arguments (double click or 'Open with' in Windows Explorer)
function findPdfInArgs(args: string[]): string | null {
  for (const arg of args) {
    if (typeof arg === 'string' && arg.toLowerCase().endsWith('.pdf') && !arg.startsWith('--')) {
      return path.resolve(arg);
    }
  }
  return null;
}

// Extract specific tool from arguments (Windows Taskbar JumpList)
function findToolInArgs(args: string[]): string | null {
  for (const arg of args) {
    if (typeof arg === 'string' && arg.startsWith('--tool=')) {
      return arg.split('=')[1] || null;
    }
  }
  return null;
}

// Single Instance Lock: prevents duplicate processes and handles file opening
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_, commandLine) => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
      const targetPdf = findPdfInArgs(commandLine);
      if (targetPdf) {
        win.webContents.send('app:openFileExternal', targetPdf);
      }
      const targetTool = findToolInArgs(commandLine);
      if (targetTool) {
        win.webContents.send('app:openToolExternal', targetTool);
      }
    }
  });
}

// Capture initial file from argv if present
initialPdfPath = findPdfInArgs(process.argv);
initialToolId = findToolInArgs(process.argv);

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


// Windows Taskbar JumpList configuration
function setupJumpList() {
  if (process.platform !== 'win32') return;
  try {
    app.setJumpList([
      {
        type: 'custom',
        name: 'Tarefas Frequentes',
        items: [
          {
            type: 'task',
            title: 'Editar Texto (TrueEdit)',
            description: 'Edição direta de texto no PDF',
            program: process.execPath,
            args: '--tool=trueedit',
            iconPath: process.execPath,
            iconIndex: 0
          },
          {
            type: 'task',
            title: 'Comprimir PDF',
            description: 'Reduzir tamanho sem perder qualidade',
            program: process.execPath,
            args: '--tool=compress',
            iconPath: process.execPath,
            iconIndex: 0
          },
          {
            type: 'task',
            title: 'Chat com IA (Gemini & Ollama)',
            description: 'Pergunte e analise documentos com IA',
            program: process.execPath,
            args: '--tool=ai-chat',
            iconPath: process.execPath,
            iconIndex: 0
          },
          {
            type: 'task',
            title: 'Juntar Múltiplos PDFs',
            description: 'Combinar PDFs em um único arquivo',
            program: process.execPath,
            args: '--tool=merge',
            iconPath: process.execPath,
            iconIndex: 0
          }
        ]
      },
      {
        type: 'recent'
      }
    ]);
  } catch (e) {
    console.warn('Failed to configure Windows JumpList:', e);
  }
}

function createWindow() {
  const iconPath = path.join(__dirname, '../build/icon.png');

  win = new BrowserWindow({
    width: 1300,
    height: 870,
    minWidth: 960,
    minHeight: 680,
    title: 'OmniPDF Studio - Suíte Completa de PDF',
    backgroundColor: '#090d16',
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // OWASP / Security Hardening: Block unauthorized web permissions
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  // Security: Prevent arbitrary navigation inside the renderer
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    if (VITE_DEV_SERVER_URL && navigationUrl.startsWith(VITE_DEV_SERVER_URL)) {
      return;
    }
    if (navigationUrl.startsWith('file://')) {
      return;
    }
    event.preventDefault();
    try {
      const url = new URL(navigationUrl);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        shell.openExternal(navigationUrl);
      }
    } catch (e) {
      console.error('Invalid URL blocked:', navigationUrl);
    }
  });

  // Security: Restrict new windows and open safe external links in browser
  win.webContents.setWindowOpenHandler((details) => {
    try {
      const url = new URL(details.url);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        shell.openExternal(details.url);
      }
    } catch (e) {
      console.error('Invalid window URL blocked:', details.url);
    }
    return { action: 'deny' };
  });

  // Deliver initial file when renderer is ready
  win.webContents.on('did-finish-load', () => {
    if (initialPdfPath) {
      win?.webContents.send('app:openFileExternal', initialPdfPath);
      initialPdfPath = null;
    }
    if (initialToolId) {
      win?.webContents.send('app:openToolExternal', initialToolId);
      initialToolId = null;
    }
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(process.env.DIST, 'index.html'));
  }

  // Setup auto-updater only if not running in Store sandbox
  if (!process.windowsStore) {
    setupAutoUpdater();
    setupJumpList();
  }
}

// IPC Handlers
// Native Taskbar Progress Bar & Tool Launcher
ipcMain.handle('app:getInitialTool', () => {
  const tool = initialToolId;
  initialToolId = null;
  return tool;
});

ipcMain.on('window:setProgressBar', (_, progress: number) => {
  if (win && typeof progress === 'number') {
    win.setProgressBar(Math.max(-1, Math.min(1, progress)));
  }
});

ipcMain.handle('app:getInitialFile', () => {
  const file = initialPdfPath;
  initialPdfPath = null;
  return file;
});

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
    if (typeof filePath !== 'string' || !filePath.trim()) {
      throw new Error('Caminho de arquivo inválido');
    }
    const resolvedPath = path.resolve(filePath);
    const buffer = await fs.readFile(resolvedPath);
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  } catch (err: any) {
    console.error('Failed to read file:', err);
    throw new Error(`Erro ao ler arquivo: ${err.message}`);
  }
});

ipcMain.handle('fs:writeFile', async (_, filePath: string, arrayBuffer: ArrayBuffer) => {
  try {
    if (typeof filePath !== 'string' || !filePath.trim()) {
      throw new Error('Caminho de arquivo inválido');
    }
    const resolvedPath = path.resolve(filePath);
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(resolvedPath, buffer);
    return true;
  } catch (err: any) {
    console.error('Failed to write file:', err);
    throw new Error(`Erro ao salvar arquivo: ${err.message}`);
  }
});

ipcMain.handle('fs:listPdfsInDirectory', async (_, dirPath: string) => {
  try {
    if (typeof dirPath !== 'string' || !dirPath.trim()) {
      throw new Error('Caminho de pasta inválido');
    }
    const resolvedDir = path.resolve(dirPath);
    const entries = await fs.readdir(resolvedDir, { withFileTypes: true });
    const pdfFiles: { name: string; path: string; size: number }[] = [];

    for (const entry of entries) {
      if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
        const fullPath = path.join(resolvedDir, entry.name);
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
  if (typeof filePath === 'string' && filePath.trim()) {
    shell.showItemInFolder(path.resolve(filePath));
  }
  return true;
});

ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

// Updater handlers
ipcMain.handle('updater:check', async () => {
  try {
    if (!app.isPackaged || process.windowsStore) {
      return { status: 'dev-mode', message: 'Verificação de update desativada' };
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
