import React from 'react';
import { 
  BookOpen, 
  Files, 
  Scissors, 
  LayoutGrid, 
  Minimize2, 
  Droplet, 
  ShieldCheck, 
  Image as ImageIcon, 
  FileImage, 
  PenTool,
  FileCheck,
  Type,
  FileSignature,
  Hash,
  Highlighter
} from 'lucide-react';
import { ToolType } from '../types';

interface SidebarProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  hasFile: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTool, onSelectTool, hasFile }) => {
  const tools = [
    { id: 'reader' as ToolType, label: 'Visualizador PDF', icon: BookOpen, desc: 'Ler e navegar' },
    { id: 'trueedit' as ToolType, label: 'Editar Texto do PDF', icon: Type, desc: 'Substituição direta', isNew: true },
    { id: 'signature' as ToolType, label: 'Assinar PDF', icon: FileSignature, desc: 'Assinatura manuscrita', isNew: true },
    { id: 'numbering' as ToolType, label: 'Numerar Páginas', icon: Hash, desc: 'Cabeçalho e rodapé', isNew: true },
    { id: 'highlight' as ToolType, label: 'Marca-Texto', icon: Highlighter, desc: 'Destaques e grifos', isNew: true },
    { id: 'merge' as ToolType, label: 'Juntar PDFs', icon: Files, desc: 'Unir vários arquivos' },
    { id: 'split' as ToolType, label: 'Dividir PDF', icon: Scissors, desc: 'Extrair páginas' },
    { id: 'organize' as ToolType, label: 'Organizar Páginas', icon: LayoutGrid, desc: 'Girar e reordenar' },
    { id: 'compress' as ToolType, label: 'Compactar PDF', icon: Minimize2, desc: 'Reduzir tamanho' },
    { id: 'watermark' as ToolType, label: 'Marca d\'Água', icon: Droplet, desc: 'Adicionar carimbo' },
    { id: 'protect' as ToolType, label: 'Proteger PDF', icon: ShieldCheck, desc: 'Adicionar senha' },
    { id: 'pdf-to-img' as ToolType, label: 'PDF para Imagem', icon: ImageIcon, desc: 'Exportar PNG / JPG' },
    { id: 'img-to-pdf' as ToolType, label: 'Imagens para PDF', icon: FileImage, desc: 'Converter fotos em PDF' },
    { id: 'edit' as ToolType, label: 'Anotar & Notas', icon: PenTool, desc: 'Inserir notas' },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-brand-500/25">
          <FileCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
            OmniPDF
            <span className="text-[10px] font-bold bg-gradient-to-r from-amber-500/30 to-brand-500/30 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/40">
              STUDIO
            </span>
          </h1>
          <p className="text-xs text-slate-400">Suíte Completa de PDF</p>
        </div>
      </div>

      {/* Navigation Tools List */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
          Ferramentas PDF
        </div>

        {tools.map((t) => {
          const Icon = t.icon;
          const isActive = currentTool === t.id;

          return (
            <button
              key={t.id}
              onClick={() => onSelectTool(t.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left text-sm ${
                isActive
                  ? 'bg-brand-500/15 text-white font-medium border border-brand-500/30 shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent'
              }`}
            >
              <div
                className={`p-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-brand-500 text-white'
                    : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate leading-tight font-medium">{t.label}</span>
                  {t.isNew && (
                    <span className="text-[9px] font-bold bg-brand-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                      NOVO
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-400 truncate">{t.desc}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer System Status */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Motor 100% Offline
        </span>
        <span className="text-slate-400 font-mono">v1.0.0</span>
      </div>
    </aside>
  );
};
