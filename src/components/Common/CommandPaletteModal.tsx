import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  FileText,
  FolderOpen,
  Save,
  X,
  Sparkles,
  Zap,
  Shield,
  Layers,
  Scissors,
  Minimize2,
  ScanText,
  Unlock,
  ShieldCheck,
  EyeOff,
  Type,
  FileSignature,
  Hash,
  Highlighter,
  Droplet,
  Image as ImageIcon,
  Files,
  Home,
  Settings,
  History,
  Grid,
  Palette,
  ArrowRight
} from 'lucide-react';
import { ToolType, PDFFileInfo, AppNavMode } from '../../types';

export interface CommandItem {
  id: string;
  title: string;
  category: 'Ações de Documento' | 'Inteligência Artificial' | 'Edição & Manipulação' | 'Documentos Recentes' | 'Navegação';
  shortcut?: string;
  icon: React.ElementType;
  iconColor: string;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFile: () => void;
  onSaveFile?: () => void;
  onCloseFile?: () => void;
  onSelectTool: (tool: ToolType) => void;
  onSelectNav: (nav: AppNavMode) => void;
  currentFile: PDFFileInfo | null;
  recentFiles: PDFFileInfo[];
  onOpenRecent: (file: PDFFileInfo) => void;
  onToggleTheme?: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  onOpenFile,
  onSaveFile,
  onCloseFile,
  onSelectTool,
  onSelectNav,
  currentFile,
  recentFiles,
  onOpenRecent,
  onToggleTheme,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const allCommands = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [
      // Document Actions
      {
        id: 'open-file',
        title: 'Abrir Documento PDF...',
        category: 'Ações de Documento',
        shortcut: 'Ctrl + O',
        icon: FolderOpen,
        iconColor: 'text-brand-400',
        action: () => {
          onClose();
          onOpenFile();
        },
        keywords: ['abrir', 'carregar', 'importar', 'open', 'file']
      },
      ...(currentFile
        ? [
            {
              id: 'save-file',
              title: `Salvar Documento (${currentFile.name})`,
              category: 'Ações de Documento' as const,
              shortcut: 'Ctrl + S',
              icon: Save,
              iconColor: 'text-emerald-400',
              action: () => {
                onClose();
                onSaveFile?.();
              },
              keywords: ['salvar', 'download', 'exportar', 'save']
            },
            {
              id: 'close-file',
              title: `Fechar Documento (${currentFile.name})`,
              category: 'Ações de Documento' as const,
              shortcut: 'Ctrl + W',
              icon: X,
              iconColor: 'text-rose-400',
              action: () => {
                onClose();
                onCloseFile?.();
              },
              keywords: ['fechar', 'close', 'sair']
            }
          ]
        : []),

      // AI Tools
      {
        id: 'ai-chat',
        title: 'Chat com PDF (Gemini & Ollama)',
        category: 'Inteligência Artificial',
        icon: Sparkles,
        iconColor: 'text-purple-400',
        action: () => {
          onClose();
          onSelectTool('ai-chat');
        },
        keywords: ['chat', 'ia', 'ai', 'pergunta', 'resumo', 'gemini', 'ollama']
      },
      {
        id: 'translate',
        title: 'Traduzir PDF (Preservando Layout)',
        category: 'Inteligência Artificial',
        icon: Zap,
        iconColor: 'text-indigo-400',
        action: () => {
          onClose();
          onSelectTool('translate');
        },
        keywords: ['traduzir', 'traducao', 'idioma', 'ingles', 'portugues']
      },
      {
        id: 'contract-audit',
        title: 'Auditor Jurídico de Contratos',
        category: 'Inteligência Artificial',
        icon: Shield,
        iconColor: 'text-rose-400',
        action: () => {
          onClose();
          onSelectTool('contract-audit');
        },
        keywords: ['contrato', 'juridico', 'multa', 'risco', 'clausula']
      },

      // Core Manipulation Tools
      {
        id: 'trueedit',
        title: 'Editar Texto no Documento (TrueEdit)',
        category: 'Edição & Manipulação',
        icon: Type,
        iconColor: 'text-amber-400',
        action: () => {
          onClose();
          onSelectTool('trueedit');
        },
        keywords: ['editar', 'texto', 'trueedit', 'modificar', 'escrever']
      },
      {
        id: 'ocr',
        title: 'OCR - Reconhecimento Óptico de Texto',
        category: 'Edição & Manipulação',
        icon: ScanText,
        iconColor: 'text-teal-400',
        action: () => {
          onClose();
          onSelectTool('ocr');
        },
        keywords: ['ocr', 'escanear', 'imagem', 'tesseract', 'reconhecer']
      },
      {
        id: 'compress',
        title: 'Comprimir PDF (Reduzir Tamanho)',
        category: 'Edição & Manipulação',
        icon: Minimize2,
        iconColor: 'text-emerald-400',
        action: () => {
          onClose();
          onSelectTool('compress');
        },
        keywords: ['comprimir', 'reduzir', 'otimizar', 'diminuir', 'leves']
      },
      {
        id: 'merge',
        title: 'Juntar Múltiplos PDFs',
        category: 'Edição & Manipulação',
        icon: Layers,
        iconColor: 'text-cyan-400',
        action: () => {
          onClose();
          onSelectTool('merge');
        },
        keywords: ['juntar', 'mesclar', 'unir', 'combinar', 'merge']
      },
      {
        id: 'split',
        title: 'Dividir ou Extrair Páginas',
        category: 'Edição & Manipulação',
        icon: Scissors,
        iconColor: 'text-amber-400',
        action: () => {
          onClose();
          onSelectTool('split');
        },
        keywords: ['dividir', 'cortar', 'separar', 'extrair', 'split']
      },
      {
        id: 'signature',
        title: 'Assinar PDF (Digital ou Manuscrita)',
        category: 'Edição & Manipulação',
        icon: FileSignature,
        iconColor: 'text-blue-400',
        action: () => {
          onClose();
          onSelectTool('signature');
        },
        keywords: ['assinar', 'assinatura', 'carimbo', 'rubrica', 'sign']
      },
      {
        id: 'redact',
        title: 'Censurar Dados Sensíveis (LGPD)',
        category: 'Edição & Manipulação',
        icon: EyeOff,
        iconColor: 'text-slate-300',
        action: () => {
          onClose();
          onSelectTool('redact');
        },
        keywords: ['censurar', 'tarja', 'lgpd', 'ocultar', 'privacidade']
      },
      {
        id: 'protect',
        title: 'Proteger com Senha Forte',
        category: 'Edição & Manipulação',
        icon: ShieldCheck,
        iconColor: 'text-blue-400',
        action: () => {
          onClose();
          onSelectTool('protect');
        },
        keywords: ['senha', 'proteger', 'criptografia', 'seguranca']
      },
      {
        id: 'unlock',
        title: 'Desbloquear PDF Protegido',
        category: 'Edição & Manipulação',
        icon: Unlock,
        iconColor: 'text-yellow-400',
        action: () => {
          onClose();
          onSelectTool('unlock');
        },
        keywords: ['desbloquear', 'remover senha', 'imprimir']
      },
      {
        id: 'watermark',
        title: 'Adicionar Marca d\'Água',
        category: 'Edição & Manipulação',
        icon: Droplet,
        iconColor: 'text-sky-400',
        action: () => {
          onClose();
          onSelectTool('watermark');
        },
        keywords: ['marca dagua', 'watermark', 'confidencial']
      },
      {
        id: 'numbering',
        title: 'Numerar Páginas (Cabeçalho & Rodapé)',
        category: 'Edição & Manipulação',
        icon: Hash,
        iconColor: 'text-violet-400',
        action: () => {
          onClose();
          onSelectTool('numbering');
        },
        keywords: ['numerar', 'paginas', 'rodape', 'cabecalho']
      },

      // Navigation
      {
        id: 'nav-home',
        title: 'Ir para a Página Inicial (Home)',
        category: 'Navegação',
        shortcut: 'Ctrl + H',
        icon: Home,
        iconColor: 'text-brand-400',
        action: () => {
          onClose();
          onSelectNav('home');
        },
        keywords: ['home', 'inicio', 'painel']
      },
      {
        id: 'nav-catalog',
        title: 'Catálogo de Todas as Ferramentas',
        category: 'Navegação',
        icon: Grid,
        iconColor: 'text-indigo-400',
        action: () => {
          onClose();
          onSelectNav('tools');
        },
        keywords: ['catalogo', 'ferramentas', 'tools', 'todas']
      },
      {
        id: 'nav-recents',
        title: 'Ver Documentos Recentes',
        category: 'Navegação',
        icon: Files,
        iconColor: 'text-rose-400',
        action: () => {
          onClose();
          onSelectNav('recents');
        },
        keywords: ['recentes', 'historico', 'arquivos']
      },
      {
        id: 'nav-history',
        title: 'Histórico de Tarefas & Processamentos',
        category: 'Navegação',
        icon: History,
        iconColor: 'text-amber-400',
        action: () => {
          onClose();
          onSelectNav('history');
        },
        keywords: ['tarefas', 'processamento', 'atividades']
      },
      {
        id: 'nav-preferences',
        title: 'Preferências & Configurações',
        category: 'Navegação',
        shortcut: 'Ctrl + ,',
        icon: Settings,
        iconColor: 'text-slate-400',
        action: () => {
          onClose();
          onSelectNav('preferences');
        },
        keywords: ['configuracoes', 'preferencias', 'ajustes', 'ia', 'chave', 'tema']
      },
      ...(onToggleTheme
        ? [
            {
              id: 'toggle-theme',
              title: 'Alternar Tema Claro / Escuro',
              category: 'Navegação' as const,
              icon: Palette,
              iconColor: 'text-yellow-400',
              action: () => {
                onClose();
                onToggleTheme();
              },
              keywords: ['tema', 'cor', 'escuro', 'claro', 'dark', 'light', 'branco']
            }
          ]
        : [])
    ];

    // Add Recents as direct commands
    recentFiles.slice(0, 5).forEach((f) => {
      list.push({
        id: `recent-${f.id}`,
        title: `Abrir: ${f.name}`,
        category: 'Documentos Recentes',
        icon: FileText,
        iconColor: 'text-rose-400',
        action: () => {
          onClose();
          onOpenRecent(f);
        },
        keywords: ['recente', f.name.toLowerCase()]
      });
    });

    return list;
  }, [currentFile, recentFiles, onClose, onOpenFile, onSaveFile, onCloseFile, onSelectTool, onSelectNav, onOpenRecent, onToggleTheme]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = query.toLowerCase().trim();
    return allCommands.filter((cmd) => {
      const matchTitle = cmd.title.toLowerCase().includes(q);
      const matchCat = cmd.category.toLowerCase().includes(q);
      const matchKeywords = cmd.keywords?.some((k) => k.toLowerCase().includes(q));
      return matchTitle || matchCat || matchKeywords;
    });
  }, [allCommands, query]);

  // Adjust selection if filtered list shrinks
  useEffect(() => {
    if (selectedIndex >= filteredCommands.length) {
      setSelectedIndex(Math.max(0, filteredCommands.length - 1));
    }
  }, [filteredCommands.length, selectedIndex]);

  // Handle keyboard navigation inside the palette
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <Search className="w-5 h-5 text-slate-400 shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Digite um comando, ferramenta ou nome de arquivo..."
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <div className="flex items-center gap-1.5 ml-2">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-slate-800 border border-slate-700 text-slate-400 rounded">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 divide-y divide-slate-800/40">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Search className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="text-xs font-medium">Nenhum comando encontrado para "{query}"</p>
              <p className="text-[11px] text-slate-500 mt-1">Tente buscar por termos como "juntar", "ia", "editar" ou "abrir"</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredCommands.map((cmd, idx) => {
                const isSelected = idx === selectedIndex;
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    data-index={idx}
                    type="button"
                    onClick={() => cmd.action()}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-brand-500/15 border border-brand-500/30 text-white'
                        : 'hover:bg-slate-800/60 text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-brand-500/20 text-brand-400' : 'bg-slate-800/80'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${cmd.iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{cmd.title}</div>
                        <div className="text-[10px] text-slate-400 truncate">{cmd.category}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {cmd.shortcut && (
                        <kbd className="px-2 py-0.5 text-[10px] font-mono font-medium rounded bg-slate-800/80 border border-slate-700/80 text-slate-400">
                          {cmd.shortcut}
                        </kbd>
                      )}
                      {isSelected && <ArrowRight className="w-3.5 h-3.5 text-brand-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-slate-800 rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-slate-800 rounded">↓</kbd>
              Navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-slate-800 rounded">↵</kbd>
              Executar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-slate-800 rounded">Ctrl+K</kbd>
              Alternar
            </span>
          </div>
          <span>OmniPDF Studio</span>
        </div>
      </div>
    </div>
  );
};
