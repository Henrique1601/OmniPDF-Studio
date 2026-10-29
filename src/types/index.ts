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

export type AIProviderType = 'gemini' | 'ollama' | 'offline';

export type ThemeId = 
  | 'dark-slate'    // Escuro Moderno (Slate)
  | 'dark-oled'     // Preto Ônix (OLED Puro)
  | 'dark-midnight' // Meia-Noite Cyber
  | 'light-pure'    // Branco Puro Minimalista
  | 'light-slate'   // Claro Suave (Soft Silver)
  | 'light-warm'    // Papel Nobre (Warm Paper)
  | 'system'        // Sincronizado com o Sistema Operacional
  | 'scheduled';    // Programado por Horário (Dia/Noite automático)

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  category: 'dark' | 'light' | 'auto';
  description: string;
  colors: {
    bg: string;
    card: string;
    nav: string;
    border: string;
    text: string;
    accent: string;
  };
}

export interface AppPreferences {
  theme: ThemeId;
  themeDayStart?: string; // ex: "06:00"
  themeNightStart?: string; // ex: "18:00"
  aiProvider: AIProviderType;
  geminiApiKey: string;
  ollamaUrl: string;
  ollamaModel: string;
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
  fontFamily?: 'sans' | 'serif' | 'mono';
  isBold?: boolean;
  isItalic?: boolean;
  isOcr?: boolean;
  confidence?: number;
  sampledBgColor?: { r: number; g: number; b: number };
}

export interface TextEditItem {
  id: string;
  pageNumber: number;
  pdfX: number;
  pdfY: number;
  pdfWidth: number;
  pdfHeight: number;
  origPdfX?: number;
  origPdfY?: number;
  origPdfWidth?: number;
  origPdfHeight?: number;
  screenLeft?: number;
  screenTop?: number;
  originalText: string;
  newText: string;
  fontSize: number;
  fontFamily?: 'sans' | 'serif' | 'mono';
  isBold?: boolean;
  isItalic?: boolean;
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
  
  // File association & external open
  getInitialFile?: () => Promise<string | null>;
  onOpenFileExternal?: (callback: (filePath: string) => void) => () => void;
  getInitialTool?: () => Promise<string | null>;
  onOpenToolExternal?: (callback: (toolId: string) => void) => () => void;
  setProgressBar?: (progress: number) => void;
  getPathForFile?: (file: File) => string;
  openExternal?: (url: string) => Promise<boolean>;

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
