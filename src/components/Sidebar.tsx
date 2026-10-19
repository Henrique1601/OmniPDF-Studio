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
  Highlighter,
  Sparkles,
  ScanText,
  EyeOff,
  GitCompare,
  Layers
} from 'lucide-react';
import { ToolType } from '../types';

interface SidebarProps {
  currentTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  hasFile: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTool, onSelectTool }) => {
  const toolSections = [
    {
      title: 'Inteligência & Edição',
      items: [
        { id: 'ai-chat' as ToolType, label: 'Chat com PDF (IA)', icon: Sparkles, desc: 'Gemini 2.5 & Offline', badge: 'PRO' },
        { id: 'trueedit' as ToolType, label: 'Editar Texto do PDF', icon: Type, desc: 'Edição direta no PDF', badge: 'EXCLUSIVO' },
        { id: 'ocr' as ToolType, label: 'OCR Offline', icon: ScanText, desc: 'Extrair texto de imagens', badge: 'NOVO' },
        { id: 'redact' as ToolType, label: 'Censurar & Redigir', icon: EyeOff, desc: 'Remoção de dados confidenciais', badge: 'NOVO' },
        { id: 'compare' as ToolType, label: 'Comparar PDFs', icon: GitCompare, desc: 'Diff visual & textual', badge: 'NOVO' },
      ]
    },
    {
      title: 'Anotações & Documentos',
      items: [
        { id: 'reader' as ToolType, label: 'Visualizador PDF', icon: BookOpen, desc: 'Leitor e navegação' },
        { id: 'signature' as ToolType, label: 'Assinar PDF', icon: FileSignature, desc: 'Assinatura manuscrita' },
        { id: 'numbering' as ToolType, label: 'Numerar Páginas', icon: Hash, desc: 'Cabeçalho e rodapé' },
        { id: 'highlight' as ToolType, label: 'Marca-Texto', icon: Highlighter, desc: 'Grifos coloridos' },
        { id: 'batch' as ToolType, label: 'Processar em Lote', icon: Layers, desc: 'Ações em múltiplos PDFs', badge: 'NOVO' },
      ]
    },
    {
      title: 'Organização & Conversão',
      items: [
        { id: 'merge' as ToolType, label: 'Juntar PDFs', icon: Files, desc: 'Unir vários arquivos' },
        { id: 'split' as ToolType, label: 'Dividir PDF', icon: Scissors, desc: 'Extrair páginas' },
        { id: 'organize' as ToolType, label: 'Organizar Páginas', icon: LayoutGrid, desc: 'Girar e reordenar' },
        { id: 'compress' as ToolType, label: 'Compactar PDF', icon: Minimize2, desc: 'Reduzir tamanho' },
        { id: 'watermark' as ToolType, label: 'Marca d\'Água', icon: Droplet, desc: 'Adicionar carimbo' },
        { id: 'protect' as ToolType, label: 'Proteger PDF', icon: ShieldCheck, desc: 'Adicionar senha' },
        { id: 'pdf-to-img' as ToolType, label: 'PDF para Imagem', icon: ImageIcon, desc: 'Exportar PNG / JPG' },
        { id: 'img-to-pdf' as ToolType, label: 'Imagens para PDF', icon: FileImage, desc: 'Converter fotos em PDF' },
        { id: 'edit' as ToolType, label: 'Anotar & Notas', icon: PenTool, desc: 'Inserir notas' },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full shrink-0 select-none">
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
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {toolSections.map((sec, sIdx) => (
          <div key={sIdx} className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {sec.title}
            </div>
            {sec.items.map((t) => {
              const Icon = t.icon;
              const isActive = currentTool === t.id;

              return (
                <button
                  key={t.id}
                  onClick={() => onSelectTool(t.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all text-left text-sm ${
                    isActive
                      ? 'bg-brand-500/15 text-white font-medium border border-brand-500/30 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent'
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-brand-500 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="truncate leading-tight text-xs font-medium">{t.label}</span>
                      {t.badge && (
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                          t.badge === 'PRO' 
                            ? 'bg-purple-900/60 text-purple-300 border border-purple-500/40'
                            : t.badge === 'EXCLUSIVO'
                            ? 'bg-amber-900/60 text-amber-300 border border-amber-500/40'
                            : 'bg-brand-900/60 text-brand-300 border border-brand-500/40'
                        }`}>
                          {t.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{t.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer System Status */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Motor Offline & Seguro
        </span>
        <span className="text-slate-400 font-mono">v1.0.0</span>
      </div>
    </aside>
  );
};
