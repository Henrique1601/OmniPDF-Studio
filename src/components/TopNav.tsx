import React from 'react';
import { FolderOpen, Save, X, FileText, Info } from 'lucide-react';
import { PDFFileInfo } from '../types';

interface TopNavProps {
  currentFile: PDFFileInfo | null;
  onOpenFile: () => void;
  onSaveCurrentFile?: () => void;
  onCloseFile?: () => void;
  activeToolName: string;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentFile,
  onOpenFile,
  onSaveCurrentFile,
  onCloseFile,
  activeToolName,
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <header className="h-14 bg-slate-900/90 backdrop-blur border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center space-x-3">
        <button
          onClick={onOpenFile}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition-all active:scale-95"
        >
          <FolderOpen className="w-4 h-4" />
          <span>Abrir PDF</span>
        </button>

        {currentFile && (
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs">
            <FileText className="w-4 h-4 text-brand-400" />
            <span className="font-medium text-slate-200 max-w-[200px] truncate">
              {currentFile.name}
            </span>
            <span className="text-slate-400 font-mono text-[11px]">
              ({formatFileSize(currentFile.size)} • {currentFile.pageCount || 0} pág.)
            </span>
            {onCloseFile && (
              <button
                onClick={onCloseFile}
                title="Fechar arquivo"
                className="text-slate-400 hover:text-rose-400 ml-1 p-0.5 rounded transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="text-xs text-slate-400 flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span>Modo: <strong className="text-slate-200 font-medium">{activeToolName}</strong></span>
        </div>

        {currentFile && onSaveCurrentFile && (
          <button
            onClick={onSaveCurrentFile}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all active:scale-95"
          >
            <Save className="w-3.5 h-3.5 text-slate-300" />
            <span>Salvar Como</span>
          </button>
        )}
      </div>
    </header>
  );
};
