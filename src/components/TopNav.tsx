import React from 'react';
import { FolderOpen, Save, X, FileText, Info, Plus, Home, Bell, Sparkles } from 'lucide-react';
import { PDFFileInfo, AppNavMode, ToolType } from '../types';
import { ThemeQuickSelector } from './Common/ThemeQuickSelector';

interface TopNavProps {
  currentNav: AppNavMode;
  onSelectNav: (nav: AppNavMode) => void;
  currentTool: ToolType | null;
  onCloseTool: () => void;
  currentFile: PDFFileInfo | null;
  onOpenFile: () => void;
  onSaveCurrentFile?: () => void;
  onCloseFile?: () => void;
  activeToolName: string;
  hasUpdateAvailable?: boolean;
  onOpenPreferences: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentNav,
  onSelectNav,
  currentTool,
  onCloseTool,
  currentFile,
  onOpenFile,
  onSaveCurrentFile,
  onCloseFile,
  activeToolName,
  hasUpdateAvailable,
  onOpenPreferences
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <header className="h-11 bg-[#18181b] border-b border-[#27272a] flex items-center justify-between px-3 shrink-0 select-none">
      {/* Left: Tab bar (Exact iLovePDF match: Home tab, Document Tab, + Tab) */}
      <div className="flex items-center gap-1.5 overflow-x-auto">
        <button
          onClick={() => {
            onCloseTool();
            onSelectNav('home');
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            currentNav === 'home' && !currentTool
              ? 'bg-[#27272a] text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-[#27272a]/50'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </button>

        {currentTool && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#27272a] text-white text-xs font-medium border border-rose-500/30">
            <Sparkles className="w-3 h-3 text-rose-400" />
            <span className="truncate max-w-[140px]">{activeToolName}</span>
            <button
              onClick={onCloseTool}
              title="Voltar ao Catálogo"
              className="text-slate-400 hover:text-white p-0.5 rounded transition-colors ml-1"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {currentFile && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#27272a] text-slate-200 text-xs font-medium border border-[#3f3f46]">
            <FileText className="w-3.5 h-3.5 text-rose-400" />
            <span className="truncate max-w-[160px]">{currentFile.name}</span>
            <span className="text-[10px] text-slate-400 font-mono">
              ({formatFileSize(currentFile.size)})
            </span>
            {onCloseFile && (
              <button
                onClick={onCloseFile}
                title="Fechar arquivo"
                className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        )}

        <button
          onClick={onOpenFile}
          title="Abrir novo documento PDF"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#27272a] transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: Actions, Theme Selector, Update Notification & Save */}
      <div className="flex items-center gap-2.5">
        <ThemeQuickSelector onOpenPreferences={onOpenPreferences} />

        {hasUpdateAvailable && (
          <button
            onClick={onOpenPreferences}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px] font-semibold animate-pulse"
          >
            <Bell className="w-3 h-3" />
            <span>Atualização Disponível!</span>
          </button>
        )}

        {currentFile && onSaveCurrentFile && (
          <button
            onClick={onSaveCurrentFile}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium shadow-sm transition-all active:scale-95"
          >
            <Save className="w-3 h-3" />
            <span>Salvar Como</span>
          </button>
        )}
      </div>
    </header>
  );
};
