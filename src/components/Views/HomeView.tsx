import React from 'react';
import { UploadCloud, FileText, ArrowRight, Sparkles, Shield, Cpu, Zap, FolderOpen } from 'lucide-react';
import { ToolType, PDFFileInfo } from '../../types';

interface HomeViewProps {
  onOpenFile: () => void;
  onSelectTool: (tool: ToolType) => void;
  recentFiles: PDFFileInfo[];
  onOpenRecent: (file: PDFFileInfo) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onOpenFile,
  onSelectTool,
  recentFiles,
  onOpenRecent
}) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#12141a] overflow-y-auto text-slate-100 p-8 select-none">
      <div className="max-w-5xl mx-auto w-full space-y-8">
        {/* Hero Section */}
        <div className="p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-brand-950/30 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              OmniPDF Studio v1.0.0
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight leading-tight">
              A mais poderosa suíte de PDF offline com IA integrada
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              Edição direta no documento (TrueEdit), OCR em imagens, auditoria jurídica de contratos, tradução preservando layout e mais de 20 ferramentas prontas para uso.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={onOpenFile}
                className="px-6 py-3 bg-gradient-to-r from-brand-600 to-rose-600 hover:from-brand-700 hover:to-rose-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-500/25 transition-all flex items-center gap-2"
              >
                <FolderOpen className="w-4 h-4" />
                Abrir Documento PDF
              </button>
              <button
                onClick={() => onSelectTool('trueedit')}
                className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                Editar Texto (TrueEdit)
              </button>
            </div>
          </div>
        </div>

        {/* Quick Launch Cards */}
        <div className="grid grid-cols-4 gap-4">
          <button
            onClick={() => onSelectTool('ai-chat')}
            className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/40 hover:bg-slate-850 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-200">Chat com PDF</h3>
            <p className="text-[11px] text-slate-400 mt-1">Pergunte e analise documentos com Gemini 2.5</p>
          </button>

          <button
            onClick={() => onSelectTool('translate')}
            className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 hover:bg-slate-850 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-200">Traduzir PDF</h3>
            <p className="text-[11px] text-slate-400 mt-1">Tradução preservando diagramação original</p>
          </button>

          <button
            onClick={() => onSelectTool('contract-audit')}
            className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 hover:bg-slate-850 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-200">Auditor Jurídico</h3>
            <p className="text-[11px] text-slate-400 mt-1">Análise de riscos e multas em contratos</p>
          </button>

          <button
            onClick={() => onSelectTool('batch')}
            className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-850 transition-all text-left group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-200">Lote (Batch)</h3>
            <p className="text-[11px] text-slate-400 mt-1">Comprimir e proteger múltiplos PDFs juntos</p>
          </button>
        </div>

        {/* Recents list if available */}
        {recentFiles.length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-400" />
              Documentos Recentes
            </h2>
            <div className="divide-y divide-slate-800">
              {recentFiles.slice(0, 5).map((f) => (
                <div
                  key={f.id}
                  onClick={() => onOpenRecent(f)}
                  className="py-2.5 flex items-center justify-between hover:bg-slate-850 px-3 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-4 h-4 text-rose-400 shrink-0" />
                    <span className="text-xs font-medium text-slate-200 truncate">{f.name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[11px] text-slate-500">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
