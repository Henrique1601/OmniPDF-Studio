export type ToolType = 
  | 'reader'
  | 'trueedit'
  | 'merge'
  | 'split'
  | 'organize'
  | 'compress'
  | 'watermark'
  | 'protect'
  | 'pdf-to-img'
  | 'img-to-pdf'
  | 'edit';

export interface PDFFileInfo {
  id: string;
  name: string;
  path?: string;
  size: number;
  pageCount?: number;
  data: ArrayBuffer;
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
  saveFileDialog: (options?: { defaultPath?: string; filters?: { name: string; extensions: string[] }[] }) => Promise<string | null>;
  readFile: (filePath: string) => Promise<ArrayBuffer>;
  writeFile: (filePath: string, buffer: ArrayBuffer) => Promise<boolean>;
  showItemInFolder: (filePath: string) => Promise<boolean>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  getAppVersion: () => Promise<string>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
