import React from 'react';
import { Clock, FileText, ArrowRight, Trash2, FolderOpen } from 'lucide-react';
import { PDFFileInfo } from '../../types';

interface RecentsViewProps {
  recentFiles: PDFFileInfo[];
  onOpenRecent: (file: PDFFileInfo) => void;
  onClearRecents: () => void;
  onOpenFile: () => void;
}

export const RecentsView: React.FC<RecentsViewProps> = ({
  recentFiles,
  onOpenRecent,
  onClearRecents,
  onOpenFile
}) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#12141a] overflow-y-auto text-slate-100 p-8 select-none">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Clock className="w-6 h-6 text-brand-500" />
              Documentos Recentes
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Histórico de arquivos abertos recentemente nesta estação de trabalho
            </p>
          </div>

          {recentFiles.length > 0 && (
            <button
              onClick={onClearRecents}
              className="px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar Histórico
            </button>
          )}
        </div>

        {recentFiles.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-800 rounded-2xl">
            <Clock className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-sm font-semibold text-slate-300 mb-1">Nenhum documento recente</h3>
            <p className="text-xs text-slate-500 mb-4">Abra um documento PDF para que ele apareça aqui.</p>
            <button
              onClick={onOpenFile}
              className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-2"
            >
              <FolderOpen className="w-4 h-4" />
              Abrir Arquivo PDF
            </button>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800 overflow-hidden">
            {recentFiles.map((f) => (
              <div
                key={f.id}
                onClick={() => onOpenRecent(f)}
                className="p-4 flex items-center justify-between hover:bg-slate-850 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-red-950/40 text-red-400 border border-red-500/30 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-200 truncate">{f.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{f.path || 'Armazenamento local'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs font-mono text-slate-400">
                    {(f.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
