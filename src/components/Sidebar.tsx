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
  FileCheck
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
    { id: 'merge' as ToolType, label: 'Juntar PDFs', icon: Files, desc: 'Unir vários arquivos' },
    { id: 'split' as ToolType, label: 'Dividir PDF', icon: Scissors, desc: 'Extrair páginas' },
    { id: 'organize' as ToolType, label: 'Organizar Páginas', icon: LayoutGrid, desc: 'Girar e reordenar' },
    { id: 'compress' as ToolType, label: 'Compactar PDF', icon: Minimize2, desc: 'Reduzir tamanho' },
    { id: 'watermark' as ToolType, label: 'Marca d\'Água', icon: Droplet, desc: 'Adicionar carimbo' },
    { id: 'protect' as ToolType, label: 'Proteger PDF', icon: ShieldCheck, desc: 'Adicionar senha' },
    { id: 'pdf-to-img' as ToolType, label: 'PDF para Imagem', icon: ImageIcon, desc: 'Exportar PNG / JPG' },
    { id: 'img-to-pdf' as ToolType, label: 'Imagens para PDF', icon: FileImage, desc: 'Converter fotos em PDF' },
    { id: 'edit' as ToolType, label: 'Editar & Anotar', icon: PenTool, desc: 'Texto e notas' },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-rose-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
          <FileCheck className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-lg text-white tracking-tight flex items-center gap-1.5">
            HbsPDFed
            <span className="text-[10px] font-semibold bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded border border-brand-500/30">
              PRO
            </span>
          </h1>
          <p className="text-xs text-slate-400">PDF Reader & Editor</p>
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
                <div className="truncate leading-tight font-medium">{t.label}</div>
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
