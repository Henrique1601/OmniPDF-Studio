import React, { useState } from 'react';
import {
  Files,
  Scissors,
  LayoutGrid,
  Minimize2,
  Droplet,
  ShieldCheck,
  Image as ImageIcon,
  FileImage,
  PenTool,
  Type,
  FileSignature,
  Hash,
  Highlighter,
  Sparkles,
  ScanText,
  EyeOff,
  GitCompare,
  Layers,
  Languages,
  Scale,
  Search,
  Unlock,
  ChevronDown,
  ChevronRight,
  Filter,
  Bot,
  Key
} from 'lucide-react';
import { ToolType } from '../../types';

interface ToolsCatalogViewProps {
  onSelectTool: (tool: ToolType) => void;
  onOpenPreferences?: () => void;
}

interface ToolCardItem {
  id: ToolType;
  title: string;
  desc: string;
  icon: React.ElementType;
  bgGradient: string;
  iconColor: string;
  badge?: string;
}

interface ToolCategory {
  name: string;
  description: string;
  tools: ToolCardItem[];
}

export const ToolsCatalogView: React.FC<ToolsCatalogViewProps> = ({ onSelectTool, onOpenPreferences }) => {
  const [search, setSearch] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

  const toggleCategory = (catName: string) => {
    setCollapsedCategories(prev => ({ ...prev, [catName]: !prev[catName] }));
  };

  const categories: ToolCategory[] = [
    {
      name: 'Inteligência Artificial & Smart Tools',
      description: 'Potencializado por LLMs locais e Gemini 2.5 Flash',
      tools: [
        {
          id: 'ai-chat',
          title: 'Chat com PDF (IA)',
          desc: 'Pergunte, resuma e converse com seu documento',
          icon: Sparkles,
          bgGradient: 'from-purple-500/20 to-indigo-500/20 border-purple-500/30',
          iconColor: 'text-purple-400',
          badge: 'PRO'
        },
        {
          id: 'translate',
          title: 'Traduzir PDF',
          desc: 'Tradução integral preservando o layout nativo',
          icon: Languages,
          bgGradient: 'from-indigo-500/20 to-blue-500/20 border-indigo-500/30',
          iconColor: 'text-indigo-400',
          badge: 'NOVO'
        },
        {
          id: 'contract-audit',
          title: 'Auditor de Contratos',
          desc: 'Análise de cláusulas, multas e score de risco',
          icon: Scale,
          bgGradient: 'from-rose-500/20 to-amber-500/20 border-rose-500/30',
          iconColor: 'text-rose-400',
          badge: 'NOVO'
        },
        {
          id: 'folder-rag',
          title: 'Busca em Pastas (RAG)',
          desc: 'Pesquisa semântica em múltiplos PDFs locais',
          icon: Search,
          bgGradient: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
          iconColor: 'text-cyan-400',
          badge: 'NOVO'
        },
      ]
    },
    {
      name: 'Organize PDF',
      description: 'Estruturação e manipulação de páginas',
      tools: [
        {
          id: 'merge',
          title: 'Merge PDF',
          desc: 'Unir múltiplos arquivos em um só',
          icon: Files,
          bgGradient: 'from-red-500/20 to-orange-500/20 border-red-500/30',
          iconColor: 'text-red-400'
        },
        {
          id: 'split',
          title: 'Split PDF',
          desc: 'Separar páginas ou extrair intervalos',
          icon: Scissors,
          bgGradient: 'from-red-500/20 to-rose-500/20 border-red-500/30',
          iconColor: 'text-rose-400'
        },
        {
          id: 'organize',
          title: 'Organize PDF',
          desc: 'Ordenar, girar e excluir páginas',
          icon: LayoutGrid,
          bgGradient: 'from-orange-500/20 to-amber-500/20 border-orange-500/30',
          iconColor: 'text-orange-400'
        },
        {
          id: 'batch',
          title: 'Processamento em Lote',
          desc: 'Aplicar ações em dezenas de arquivos juntos',
          icon: Layers,
          bgGradient: 'from-amber-500/20 to-yellow-500/20 border-amber-500/30',
          iconColor: 'text-amber-400',
          badge: 'FAST'
        },
      ]
    },
    {
      name: 'Optimize & Security',
      description: 'Desempenho, privacidade e controle de acesso',
      tools: [
        {
          id: 'compress',
          title: 'Compress PDF',
          desc: 'Reduzir tamanho sem perder qualidade',
          icon: Minimize2,
          bgGradient: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/30',
          iconColor: 'text-emerald-400'
        },
        {
          id: 'ocr',
          title: 'OCR PDF',
          desc: 'Extração óptica de texto de documentos escaneados',
          icon: ScanText,
          bgGradient: 'from-teal-500/20 to-cyan-500/20 border-teal-500/30',
          iconColor: 'text-teal-400',
          badge: 'OFFLINE'
        },
        {
          id: 'unlock',
          title: 'Desbloquear PDF',
          desc: 'Remover permissões e restrições de impressão',
          icon: Unlock,
          bgGradient: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
          iconColor: 'text-yellow-400',
          badge: 'LIVRE'
        },
        {
          id: 'protect',
          title: 'Proteger PDF',
          desc: 'Adicionar senha forte e criptografia',
          icon: ShieldCheck,
          bgGradient: 'from-blue-500/20 to-indigo-500/20 border-blue-500/30',
          iconColor: 'text-blue-400'
        },
        {
          id: 'redact',
          title: 'Censurar (LGPD)',
          desc: 'Tarjas pretas permanentes para dados sensíveis',
          icon: EyeOff,
          bgGradient: 'from-neutral-500/20 to-slate-500/20 border-slate-500/30',
          iconColor: 'text-slate-300'
        },
      ]
    },
    {
      name: 'Edit & Review',
      description: 'Edição in-place, assinaturas e anotações',
      tools: [
        {
          id: 'trueedit',
          title: 'Editar Texto (TrueEdit)',
          desc: 'Substituição direta do texto nas coordenadas reais',
          icon: Type,
          bgGradient: 'from-amber-500/20 to-rose-500/20 border-amber-500/30',
          iconColor: 'text-amber-400',
          badge: 'EXCLUSIVO'
        },
        {
          id: 'signature',
          title: 'Assinar PDF',
          desc: 'Assinatura digital manuscrita ou carimbo',
          icon: FileSignature,
          bgGradient: 'from-sky-500/20 to-blue-500/20 border-sky-500/30',
          iconColor: 'text-sky-400'
        },
        {
          id: 'numbering',
          title: 'Numerar Páginas',
          desc: 'Adicionar cabeçalho e rodapé automáticos',
          icon: Hash,
          bgGradient: 'from-indigo-500/20 to-violet-500/20 border-indigo-500/30',
          iconColor: 'text-indigo-400'
        },
        {
          id: 'highlight',
          title: 'Marca-Texto',
          desc: 'Destaques coloridos e anotações visuais',
          icon: Highlighter,
          bgGradient: 'from-yellow-500/20 to-amber-500/20 border-yellow-500/30',
          iconColor: 'text-yellow-400'
        },
        {
          id: 'watermark',
          title: 'Marca d\'Água',
          desc: 'Carimbos de texto com ângulo e transparência',
          icon: Droplet,
          bgGradient: 'from-blue-500/20 to-teal-500/20 border-blue-500/30',
          iconColor: 'text-blue-400'
        },
        {
          id: 'compare',
          title: 'Comparar PDFs',
          desc: 'Diff lado a lado visual e textual',
          icon: GitCompare,
          bgGradient: 'from-violet-500/20 to-purple-500/20 border-violet-500/30',
          iconColor: 'text-violet-400'
        },
      ]
    },
    {
      name: 'Convert PDF',
      description: 'Intercâmbio entre imagens e documentos',
      tools: [
        {
          id: 'pdf-to-img',
          title: 'PDF para Imagem',
          desc: 'Extrair páginas em PNG de alta definição',
          icon: ImageIcon,
          bgGradient: 'from-amber-500/20 to-orange-500/20 border-amber-500/30',
          iconColor: 'text-amber-400'
        },
        {
          id: 'img-to-pdf',
          title: 'Imagens para PDF',
          desc: 'Converter fotos e digitalizações em PDF',
          icon: FileImage,
          bgGradient: 'from-emerald-500/20 to-green-500/20 border-emerald-500/30',
          iconColor: 'text-emerald-400'
        },
        {
          id: 'edit',
          title: 'Anotar & Notas',
          desc: 'Desenhar formas e notas adesivas no documento',
          icon: PenTool,
          bgGradient: 'from-slate-500/20 to-gray-500/20 border-slate-500/30',
          iconColor: 'text-slate-300'
        },
      ]
    }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#12141a] overflow-y-auto text-slate-100 p-8 select-none">
      {/* Top Header of Tools Catalog */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
            Ferramentas
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {categories.reduce((acc, c) => acc + c.tools.length, 0)} disponíveis
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Selecione uma ferramenta para executar operações instantâneas com privacidade offline
          </p>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Filtrar ferramentas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 px-3.5 py-2 text-xs rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Categories and Cards Grid */}
      <div className="space-y-8">
        {categories.map((cat, cIdx) => {
          const filteredTools = cat.tools.filter(t =>
            t.title.toLowerCase().includes(search.toLowerCase()) ||
            t.desc.toLowerCase().includes(search.toLowerCase())
          );

          if (filteredTools.length === 0) return null;
          const isCollapsed = collapsedCategories[cat.name];

          return (
            <div key={cIdx} className="space-y-4">
              <div
                onClick={() => toggleCategory(cat.name)}
                className="flex items-center gap-2 cursor-pointer group"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                )}
                <h2 className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">
                  {cat.name}
                </h2>
                <span className="text-xs text-slate-500">
                  — {cat.description}
                </span>
              </div>

              {!isCollapsed && (
                <>
                  {cat.name.includes('Inteligência Artificial') && (
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900 border border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-purple-950/20">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                            <span>Requisito das Ferramentas de IA & Smart Tools</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-500/40">
                              Aviso Importante
                            </span>
                          </h4>
                          <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                            Para utilizar estas funcionalidades com análise profunda, é necessário configurar uma <strong>Chave de API (Google Gemini)</strong> ou ter uma <strong>LLM local instalada no seu computador (Ollama / LM Studio)</strong>. Sem uma delas, as ferramentas operam via motor heurístico semântico offline embutido.
                          </p>
                        </div>
                      </div>
                      {onOpenPreferences && (
                        <button
                          onClick={onOpenPreferences}
                          className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 shrink-0 whitespace-nowrap active:scale-95"
                        >
                          <Key className="w-3.5 h-3.5" />
                          Configurar API / LLM Local
                        </button>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredTools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => onSelectTool(tool.id)}
                        className="group relative flex flex-col items-center justify-center p-5 rounded-2xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800/90 hover:border-slate-700/80 hover:shadow-xl hover:shadow-black/40 transition-all text-center h-44"
                      >
                        {tool.badge && (
                          <span className={`absolute top-3 right-3 text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            tool.badge === 'PRO'
                              ? 'bg-purple-950/60 text-purple-300 border-purple-500/40'
                              : tool.badge === 'EXCLUSIVO'
                              ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                              : 'bg-brand-950/60 text-brand-300 border-brand-500/40'
                          }`}>
                            {tool.badge}
                          </span>
                        )}

                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tool.bgGradient} border flex items-center justify-center mb-3 shadow-inner group-hover:scale-110 transition-transform`}>
                          <Icon className={`w-7 h-7 ${tool.iconColor}`} />
                        </div>

                        <h3 className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
                          {tool.title}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-tight">
                          {tool.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
