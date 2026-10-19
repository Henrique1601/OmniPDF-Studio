export type ToolType = 
  | 'reader'
  | 'trueedit'
  | 'signature'
  | 'ai-chat'
  | 'ocr'
  | 'redact'
  | 'compare'
  | 'batch'
  | 'numbering'
  | 'highlight'
  | 'merge'
  | 'split'
  | 'organize'
  | 'compress'
  | 'watermark'
  | 'protect'
  | 'unlock'
  | 'translate'
  | 'contract-audit'
  | 'folder-rag'
  | 'pdf-to-img'
  | 'img-to-pdf'
  | 'edit';

export type AppNavMode = 'home' | 'recents' | 'tools' | 'history' | 'preferences';

export interface PDFFileInfo {
  id: string;
  name: string;
  path?: string;
  size: number;
  pageCount?: number;
  data: ArrayBuffer;
  lastOpened?: number;
}

export interface TaskHistoryItem {
  id: string;
  tool: string;
  fileName: string;
  timestamp: number;
  status: 'success' | 'error';
  details?: string;
  outputSize?: number;
}

export interface AppPreferences {
  theme: 'dark' | 'light' | 'system';
  geminiApiKey: string;
  defaultOcrLang: 'por' | 'eng' | 'spa';
  autoCheckUpdates: boolean;
  defaultSaveDirectory?: string;
  compressionLevel: 'recommended' | 'extreme' | 'low';
}

export interface DetectedTextItem {
  id: string;
  str: string;
  pdfX: number;
  pdfY: number;
  pdfWidth: number;
  pdfHeight: number;
  fontSize: number;
  screenLeft: number;
  screenTop: number;
  screenWidth: number;
  screenHeight: number;
}

export interface TextEditItem {
  id: string;
  pageNumber: number;
  pdfX: number;
  pdfY: number;
  pdfWidth: number;
  pdfHeight: number;
  originalText: string;
  newText: string;
  fontSize: number;
  textColor?: { r: number; g: number; b: number };
  bgColor?: { r: number; g: number; b: number };
}

export interface ElectronAPI {
  openFileDialog: (options?: { multiple?: boolean; filters?: { name: string; extensions: string[] }[] }) => Promise<string[] | null>;
  openDirectoryDialog: () => Promise<string | null>;
  saveFileDialog: (options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>;
  readFile: (filePath: string) => Promise<ArrayBuffer>;
  writeFile: (filePath: string, buffer: ArrayBuffer) => Promise<boolean>;
  listPdfsInDirectory: (dirPath: string) => Promise<{ name: string; path: string; size: number }[]>;
  showItemInFolder: (filePath: string) => Promise<boolean>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  getAppVersion: () => Promise<string>;
  
  // Auto-updater
  checkForUpdates: () => Promise<any>;
  downloadUpdate: () => Promise<boolean>;
  quitAndInstallUpdate: () => void;
  onUpdaterStatus: (callback: (data: any) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
