export type ToolType = 
  | 'reader'
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
