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
  ArrowRight,
  GitCompare,
  FolderSearch,
  FileImage
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

// Normalize accents for fuzzy searching ("edição" matches "edicao")
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
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

  // Focus input automatically when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const allCommands = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [
      // 1. Document Actions
      {
        id: 'open-file',
        title: 'Abrir Documento PDF...',
        category: 'Ações de Documento',
        shortcut: 'Ctrl + O',
        icon: FolderOpen,
        iconColor: 'text-brand-500',
        action: () => {
          onClose();
          onOpenFile();
        },
        keywords: ['abrir', 'carregar', 'importar', 'open', 'file', 'arquivo']
      },
      ...(currentFile
        ? [
            {
              id: 'save-file',
              title: `Salvar Documento (${currentFile.name})`,
              category: 'Ações de Documento' as const,
              shortcut: 'Ctrl + S',
              icon: Save,
              iconColor: 'text-emerald-500',
              action: () => {
                onClose();
                onSaveFile?.();
              },
              keywords: ['salvar', 'download', 'exportar', 'save', 'gravar']
            },
            {
              id: 'close-file',
              title: `Fechar Documento Ativo (${currentFile.name})`,
              category: 'Ações de Documento' as const,
              shortcut: 'Ctrl + W',
              icon: X,
              iconColor: 'text-rose-500',
              action: () => {
                onClose();
                onCloseFile?.();
              },
              keywords: ['fechar', 'close', 'sair', 'remover']
            }
          ]
        : []),

      // 2. AI Intelligence Tools
      {
        id: 'ai-chat',
        title: 'Chat com PDF (Gemini 2.5 & Ollama Local)',
        category: 'Inteligência Artificial',
        icon: Sparkles,
        iconColor: 'text-purple-500',
        action: () => {
          onClose();
          onSelectTool('ai-chat');
        },
        keywords: ['chat', 'ia', 'ai', 'pergunta', 'resumo', 'gemini', 'ollama', 'conversar']
      },
      {
        id: 'translate',
        title: 'Traduzir PDF (Preservando Diagramação Original)',
        category: 'Inteligência Artificial',
        icon: Zap,
        iconColor: 'text-indigo-500',
        action: () => {
          onClose();
          onSelectTool('translate');
        },
        keywords: ['traduzir', 'traducao', 'idioma', 'ingles', 'portugues', 'espanhol', 'translate']
      },
      {
        id: 'contract-audit',
        title: 'Auditor Jurídico de Contratos (Riscos & Multas)',
        category: 'Inteligência Artificial',
        icon: Shield,
        iconColor: 'text-rose-500',
        action: () => {
          onClose();
          onSelectTool('contract-audit');
        },
        keywords: ['contrato', 'juridico', 'multa', 'risco', 'clausula', 'direito', 'auditoria']
      },
      {
        id: 'folder-rag',
        title: 'RAG em Pasta (Busca Semântica Multidocumentos)',
        category: 'Inteligência Artificial',
        icon: FolderSearch,
        iconColor: 'text-cyan-500',
        action: () => {
          onClose();
          onSelectTool('folder-rag');
        },
        keywords: ['rag', 'pasta', 'pesquisa', 'semantica', 'multiplos', 'documentos']
      },

      // 3. Core Manipulation & Edition
      {
        id: 'trueedit',
        title: 'Editar Texto no PDF (TrueEdit Coordenadas Reais)',
        category: 'Edição & Manipulação',
        icon: Type,
        iconColor: 'text-amber-500',
        action: () => {
          onClose();
          onSelectTool('trueedit');
        },
        keywords: ['editar', 'texto', 'trueedit', 'modificar', 'escrever', 'corrigir', 'edit']
      },
      {
        id: 'ocr',
        title: 'OCR - Reconhecimento Óptico de Texto (Offline)',
        category: 'Edição & Manipulação',
        icon: ScanText,
        iconColor: 'text-teal-500',
        action: () => {
          onClose();
          onSelectTool('ocr');
        },
        keywords: ['ocr', 'escanear', 'imagem', 'tesseract', 'reconhecer', 'scan', 'texto']
      },
      {
        id: 'compress',
        title: 'Comprimir PDF (Reduzir Tamanho do Arquivo)',
        category: 'Edição & Manipulação',
        icon: Minimize2,
        iconColor: 'text-emerald-500',
        action: () => {
          onClose();
          onSelectTool('compress');
        },
        keywords: ['comprimir', 'reduzir', 'otimizar', 'diminuir', 'leves', 'compactar', 'compress']
      },
      {
        id: 'merge',
        title: 'Juntar Múltiplos PDFs em Um Só',
        category: 'Edição & Manipulação',
        icon: Layers,
        iconColor: 'text-cyan-500',
        action: () => {
          onClose();
          onSelectTool('merge');
        },
        keywords: ['juntar', 'mesclar', 'unir', 'combinar', 'merge', 'anexar']
      },
      {
        id: 'split',
        title: 'Dividir ou Extrair Páginas do PDF',
        category: 'Edição & Manipulação',
        icon: Scissors,
        iconColor: 'text-amber-500',
        action: () => {
          onClose();
          onSelectTool('split');
        },
        keywords: ['dividir', 'cortar', 'separar', 'extrair', 'split', 'paginas']
      },
      {
        id: 'organize',
        title: 'Organizar & Reordenar Páginas',
        category: 'Edição & Manipulação',
        icon: Files,
        iconColor: 'text-indigo-500',
        action: () => {
          onClose();
          onSelectTool('organize');
        },
        keywords: ['organizar', 'reordenar', 'rotacionar', 'excluir', 'mover', 'paginas']
      },
      {
        id: 'signature',
        title: 'Assinar PDF (Assinatura Digital ou Manuscrita)',
        category: 'Edição & Manipulação',
        icon: FileSignature,
        iconColor: 'text-blue-500',
        action: () => {
          onClose();
          onSelectTool('signature');
        },
        keywords: ['assinar', 'assinatura', 'carimbo', 'rubrica', 'sign', 'firma']
      },
      {
        id: 'redact',
        title: 'Censurar Dados Sensíveis (LGPD / Tarja Preta)',
        category: 'Edição & Manipulação',
        icon: EyeOff,
        iconColor: 'text-slate-500',
        action: () => {
          onClose();
          onSelectTool('redact');
        },
        keywords: ['censurar', 'tarja', 'lgpd', 'ocultar', 'privacidade', 'anonimizar', 'redact']
      },
      {
        id: 'protect',
        title: 'Proteger PDF com Senha e Criptografia Forte',
        category: 'Edição & Manipulação',
        icon: ShieldCheck,
        iconColor: 'text-blue-500',
        action: () => {
          onClose();
          onSelectTool('protect');
        },
        keywords: ['senha', 'proteger', 'criptografia', 'seguranca', 'password', 'lock']
      },
      {
        id: 'unlock',
        title: 'Desbloquear PDF Protegido (Remover Restrições)',
        category: 'Edição & Manipulação',
        icon: Unlock,
        iconColor: 'text-yellow-500',
        action: () => {
          onClose();
          onSelectTool('unlock');
        },
        keywords: ['desbloquear', 'remover senha', 'imprimir', 'liberar', 'unlock']
      },
      {
        id: 'watermark',
        title: 'Adicionar Marca d\'Água de Texto ou Imagem',
        category: 'Edição & Manipulação',
        icon: Droplet,
        iconColor: 'text-sky-500',
        action: () => {
          onClose();
          onSelectTool('watermark');
        },
        keywords: ['marca dagua', 'watermark', 'confidencial', 'copia']
      },
      {
        id: 'numbering',
        title: 'Numerar Páginas (Cabeçalho & Rodapé)',
        category: 'Edição & Manipulação',
        icon: Hash,
        iconColor: 'text-violet-500',
        action: () => {
          onClose();
          onSelectTool('numbering');
        },
        keywords: ['numerar', 'paginas', 'rodape', 'cabecalho', 'numero']
      },
      {
        id: 'highlight',
        title: 'Marca-Texto & Anotações Visuais',
        category: 'Edição & Manipulação',
        icon: Highlighter,
        iconColor: 'text-yellow-500',
        action: () => {
          onClose();
          onSelectTool('highlight');
        },
        keywords: ['marca texto', 'anotar', 'grifar', 'destaque', 'colorir']
      },
      {
        id: 'compare',
        title: 'Comparar Dois PDFs Lado a Lado (Diff Visual)',
        category: 'Edição & Manipulação',
        icon: GitCompare,
        iconColor: 'text-rose-500',
        action: () => {
          onClose();
          onSelectTool('compare');
        },
        keywords: ['comparar', 'diferenca', 'diff', 'versoes', 'revisao']
      },
      {
        id: 'batch',
        title: 'Processamento em Lote (Múltiplos Arquivos)',
        category: 'Edição & Manipulação',
        icon: Layers,
        iconColor: 'text-amber-500',
        action: () => {
          onClose();
          onSelectTool('batch');
        },
        keywords: ['lote', 'batch', 'varios', 'massa', 'conjunto']
      },
      {
        id: 'img-to-pdf',
        title: 'Imagens para PDF (JPG, PNG -> PDF)',
        category: 'Edição & Manipulação',
        icon: FileImage,
        iconColor: 'text-emerald-500',
        action: () => {
          onClose();
          onSelectTool('img-to-pdf');
        },
        keywords: ['imagem', 'foto', 'jpg', 'png', 'converter']
      },

      // 4. Navigation & Views
      {
        id: 'nav-home',
        title: 'Ir para a Página Inicial (Home)',
        category: 'Navegação',
        shortcut: 'Ctrl + H',
        icon: Home,
        iconColor: 'text-brand-500',
        action: () => {
          onClose();
          onSelectNav('home');
        },
        keywords: ['home', 'inicio', 'painel', 'comeco']
      },
      {
        id: 'nav-catalog',
        title: 'Catálogo de Todas as Ferramentas',
        category: 'Navegação',
        icon: Grid,
        iconColor: 'text-indigo-500',
        action: () => {
          onClose();
          onSelectNav('tools');
        },
        keywords: ['catalogo', 'ferramentas', 'tools', 'todas', 'hub']
      },
      {
        id: 'nav-recents',
        title: 'Ver Documentos Recentes',
        category: 'Navegação',
        icon: Files,
        iconColor: 'text-rose-500',
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
        iconColor: 'text-amber-500',
        action: () => {
          onClose();
          onSelectNav('history');
        },
        keywords: ['tarefas', 'processamento', 'atividades', 'log']
      },
      {
        id: 'nav-preferences',
        title: 'Preferências & Configurações',
        category: 'Navegação',
        shortcut: 'Ctrl + ,',
        icon: Settings,
        iconColor: 'text-slate-500',
        action: () => {
          onClose();
          onSelectNav('preferences');
        },
        keywords: ['configuracoes', 'preferencias', 'ajustes', 'ia', 'chave', 'tema', 'settings']
      },
      ...(onToggleTheme
        ? [
            {
              id: 'toggle-theme',
              title: 'Alternar Tema Claro / Escuro',
              category: 'Navegação' as const,
              icon: Palette,
              iconColor: 'text-yellow-500',
              action: () => {
                onClose();
                onToggleTheme();
              },
              keywords: ['tema', 'cor', 'escuro', 'claro', 'dark', 'light', 'branco', 'oled', 'marfim']
            }
          ]
        : [])
    ];

    // Add Recents
    recentFiles.slice(0, 6).forEach((f) => {
      list.push({
        id: `recent-${f.id}`,
        title: `Abrir Recente: ${f.name}`,
        category: 'Documentos Recentes',
        icon: FileText,
        iconColor: 'text-rose-500',
        action: () => {
          onClose();
          onOpenRecent(f);
        },
        keywords: ['recente', normalizeText(f.name)]
      });
    });

    return list;
  }, [currentFile, recentFiles, onClose, onOpenFile, onSaveFile, onCloseFile, onSelectTool, onSelectNav, onOpenRecent, onToggleTheme]);

  // Fuzzy search with normalized accents
  const filteredCommands = useMemo(() => {
    if (!query.trim()) return allCommands;
    const q = normalizeText(query.trim());
    return allCommands.filter((cmd) => {
      const matchTitle = normalizeText(cmd.title).includes(q);
      const matchCat = normalizeText(cmd.category).includes(q);
      const matchKeywords = cmd.keywords?.some((k) => normalizeText(k).includes(q));
      return matchTitle || matchCat || matchKeywords;
    });
  }, [allCommands, query]);

  // Ensure index remains in bounds
  useEffect(() => {
    if (selectedIndex >= filteredCommands.length) {
      setSelectedIndex(Math.max(0, filteredCommands.length - 1));
    }
  }, [filteredCommands.length, selectedIndex]);

  // Handle keyboard navigation (ArrowDown, ArrowUp, Enter, Escape)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % Math.max(1, filteredCommands.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  // Scroll active item into view
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
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-[var(--border-color)] bg-[var(--card-bg-subtle)]">
          <Search className="w-5 h-5 text-[var(--text-muted)] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite um comando, ferramenta ou nome de arquivo..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
          />
          <div className="flex items-center gap-1.5 ml-2">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-[var(--hover-bg)] border border-[var(--border-color)] text-[var(--text-muted)] rounded">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 divide-y divide-[var(--border-color)]/30">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-[var(--text-muted)]">
              <Search className="w-8 h-8 mx-auto opacity-40 mb-2" />
              <p className="text-xs font-semibold text-[var(--text-primary)]">
                Nenhum comando encontrado para "{query}"
              </p>
              <p className="text-[11px] text-[var(--text-muted)] mt-1">
                Tente buscar por termos como "juntar", "ia", "editar" ou "abrir"
              </p>
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
                        ? 'bg-brand-500/15 border border-brand-500/35 text-[var(--text-primary)] font-medium shadow-sm'
                        : 'hover:bg-[var(--hover-bg)] text-[var(--text-primary)] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-brand-500/20 text-brand-500' : 'bg-[var(--hover-bg)]'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${cmd.iconColor}`} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{cmd.title}</div>
                        <div className="text-[10px] text-[var(--text-muted)] truncate">{cmd.category}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {cmd.shortcut && (
                        <kbd className="px-2 py-0.5 text-[10px] font-mono font-medium rounded bg-[var(--hover-bg)] border border-[var(--border-color)] text-[var(--text-muted)]">
                          {cmd.shortcut}
                        </kbd>
                      )}
                      {isSelected && <ArrowRight className="w-3.5 h-3.5 text-brand-500" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="px-4 py-2 border-t border-[var(--border-color)] bg-[var(--card-bg-subtle)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-[var(--hover-bg)] border border-[var(--border-color)] rounded">↑</kbd>
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-[var(--hover-bg)] border border-[var(--border-color)] rounded">↓</kbd>
              Navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-[var(--hover-bg)] border border-[var(--border-color)] rounded">↵</kbd>
              Executar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-[var(--hover-bg)] border border-[var(--border-color)] rounded">Ctrl+K</kbd>
              Alternar
            </span>
          </div>
          <span className="font-medium text-[var(--text-muted)]">OmniPDF Studio</span>
        </div>
      </div>
    </div>
  );
};
