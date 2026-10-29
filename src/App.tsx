import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { ReaderView } from './components/ReaderView';
import { ToolsCatalogView } from './components/Views/ToolsCatalogView';
import { HomeView } from './components/Views/HomeView';
import { RecentsView } from './components/Views/RecentsView';
import { TaskHistoryView } from './components/Views/TaskHistoryView';
import { PreferencesView } from './components/Views/PreferencesView';
import { UpdateModal } from './components/Common/UpdateModal';
import { AppTourModal } from './components/Common/AppTourModal';
import { CommandPaletteModal } from './components/Common/CommandPaletteModal';
import { ToolLoadingFallback } from './components/Common/ToolLoadingFallback';
import { GlobalErrorBoundary } from './components/Common/GlobalErrorBoundary';

// Lazy-loaded heavy tools for optimal code-splitting and instant initial boot
const MergeTool = lazy(() => import('./components/Tools/MergeTool').then(m => ({ default: m.MergeTool })));
const SplitTool = lazy(() => import('./components/Tools/SplitTool').then(m => ({ default: m.SplitTool })));
const OrganizeTool = lazy(() => import('./components/Tools/OrganizeTool').then(m => ({ default: m.OrganizeTool })));
const CompressTool = lazy(() => import('./components/Tools/CompressTool').then(m => ({ default: m.CompressTool })));
const WatermarkTool = lazy(() => import('./components/Tools/WatermarkTool').then(m => ({ default: m.WatermarkTool })));
const ProtectTool = lazy(() => import('./components/Tools/ProtectTool').then(m => ({ default: m.ProtectTool })));
const ConvertTool = lazy(() => import('./components/Tools/ConvertTool').then(m => ({ default: m.ConvertTool })));
const ImagesToPdfTool = lazy(() => import('./components/Tools/ImagesToPdfTool').then(m => ({ default: m.ImagesToPdfTool })));
const EditTool = lazy(() => import('./components/Tools/EditTool').then(m => ({ default: m.EditTool })));
const DirectTextEditTool = lazy(() => import('./components/Tools/DirectTextEditTool').then(m => ({ default: m.DirectTextEditTool })));
const SignatureTool = lazy(() => import('./components/Tools/SignatureTool').then(m => ({ default: m.SignatureTool })));
const PageNumberTool = lazy(() => import('./components/Tools/PageNumberTool').then(m => ({ default: m.PageNumberTool })));
const HighlightTool = lazy(() => import('./components/Tools/HighlightTool').then(m => ({ default: m.HighlightTool })));
const AiChatTool = lazy(() => import('./components/Tools/AiChatTool').then(m => ({ default: m.AiChatTool })));
const OcrTool = lazy(() => import('./components/Tools/OcrTool').then(m => ({ default: m.OcrTool })));
const RedactTool = lazy(() => import('./components/Tools/RedactTool').then(m => ({ default: m.RedactTool })));
const CompareTool = lazy(() => import('./components/Tools/CompareTool').then(m => ({ default: m.CompareTool })));
const BatchTool = lazy(() => import('./components/Tools/BatchTool').then(m => ({ default: m.BatchTool })));
const UnlockTool = lazy(() => import('./components/Tools/UnlockTool').then(m => ({ default: m.UnlockTool })));
const TranslatorTool = lazy(() => import('./components/Tools/TranslatorTool').then(m => ({ default: m.TranslatorTool })));
const ContractAuditTool = lazy(() => import('./components/Tools/ContractAuditTool').then(m => ({ default: m.ContractAuditTool })));
const FolderRagTool = lazy(() => import('./components/Tools/FolderRagTool').then(m => ({ default: m.FolderRagTool })));

import { ToolType, AppNavMode, PDFFileInfo, TaskHistoryItem } from './types';
import { PDFService } from './services/pdfService';
import { ThemeService } from './services/themeService';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [currentNav, setCurrentNav] = useState<AppNavMode>('tools');
  const [currentTool, setCurrentTool] = useState<ToolType | null>(null);
  const [currentFile, setCurrentFile] = useState<PDFFileInfo | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      return localStorage.getItem('omnipdf_theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  const handleToggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (next === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('omnipdf_theme', next);
      showToast(next === 'dark' ? 'Modo Escuro ativado' : 'Modo Claro (Branco) ativado', 'success');
      return next;
    });
  };

  const handleSetTheme = (newTheme: 'dark' | 'light') => {
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('omnipdf_theme', newTheme);
  };

  const [hasUpdateAvailable, setHasUpdateAvailable] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ version?: string; releaseDate?: string; releaseNotes?: string } | null>(null);
  const [recentFiles, setRecentFiles] = useState<PDFFileInfo[]>([]);
  const [taskHistory, setTaskHistory] = useState<TaskHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('omnipdf_task_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const recordTask = (toolName: string, fileName: string, status: 'success' | 'error', details?: string) => {
    const item: TaskHistoryItem = {
      id: `${Date.now()}-${Math.random()}`,
      tool: toolName,
      fileName,
      timestamp: Date.now(),
      status,
      details
    };
    setTaskHistory(prev => {
      const updated = [item, ...prev].slice(0, 50);
      localStorage.setItem('omnipdf_task_history', JSON.stringify(updated));
      return updated;
    });
  };

  const addToRecents = (file: PDFFileInfo) => {
    setRecentFiles(prev => {
      const filtered = prev.filter(f => f.name !== file.name);
      return [file, ...filtered].slice(0, 20);
    });
  };

  // Auto-launch guided tour on first access
  useEffect(() => {
    try {
      const tourSeen = localStorage.getItem('omnipdf_tour_seen');
      if (tourSeen !== 'true') {
        const timer = setTimeout(() => {
          setIsTourOpen(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    } catch {
      // ignore
    }
  }, []);

  const loadPdfFromPath = async (filePath: string) => {
    try {
      if (!window.electronAPI) return;
      const data = await window.electronAPI.readFile(filePath);
      const name = filePath.split(/[\\/]/).pop() || 'documento.pdf';
      const pageCount = await PDFService.getPageCount(data);

      const fileInfo: PDFFileInfo = {
        id: Math.random().toString(),
        name,
        path: filePath,
        size: data.byteLength,
        pageCount,
        data,
        lastOpened: Date.now()
      };

      setCurrentFile(fileInfo);
      addToRecents(fileInfo);
      setCurrentTool('reader');
      showToast(`Documento "${name}" aberto no Acrobat Studio!`, 'success');
    } catch (err: any) {
      showToast(`Erro ao abrir documento: ${err.message}`, 'error');
    }
  };

  useEffect(() => {
    // Apply visual theme on boot
    ThemeService.applyTheme();

    // Check auto update listener from Electron
    let unsubscribe: (() => void) | undefined;
    if (window.electronAPI?.onUpdaterStatus) {
      unsubscribe = window.electronAPI.onUpdaterStatus((data) => {
        if (data.status === 'available' && data.version) {
          setHasUpdateAvailable(true);
          setUpdateInfo({
            version: data.version,
            releaseDate: data.releaseDate,
            releaseNotes: data.releaseNotes,
          });
          setIsUpdateModalOpen(true);
          showToast(`Nova versão v${data.version} encontrada no GitHub!`, 'success');
        }
      });

      // Proactively trigger initial check after 2 seconds
      setTimeout(() => {
        window.electronAPI?.checkForUpdates?.().catch(() => {});
      }, 2000);
    }

    // Resilient direct GitHub Releases fallback check
    const checkGitHubDirect = async () => {
      try {
        const res = await fetch('https://api.github.com/repos/Henrique1601/OmniPDF-Studio/releases/latest', {
          headers: { 'Accept': 'application/vnd.github.v3+json' }
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.tag_name) {
          const remote = data.tag_name.replace(/^v/, '');
          const rp = remote.split('.').map((n: string) => parseInt(n, 10) || 0);
          const cp = APP_VERSION.split('.').map((n: string) => parseInt(n, 10) || 0);
          let newer = false;
          for (let i = 0; i < Math.max(rp.length, cp.length); i++) {
            if ((rp[i] || 0) > (cp[i] || 0)) { newer = true; break; }
            if ((rp[i] || 0) < (cp[i] || 0)) { break; }
          }
          if (newer) {
            setHasUpdateAvailable(true);
            setUpdateInfo({
              version: remote,
              releaseDate: data.published_at,
              releaseNotes: data.body,
            });
            setIsUpdateModalOpen(true);
            showToast(`Nova versão v${remote} disponível para atualização!`, 'success');
          }
        }
      } catch {}
    };

    const directTimer = setTimeout(checkGitHubDirect, 3000);

    return () => {
      if (unsubscribe) unsubscribe();
      clearTimeout(directTimer);
    };
  }, []);

  // Listen to file associations and external file opening
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getInitialFile?.().then((filePath) => {
        if (filePath) {
          loadPdfFromPath(filePath);
        }
      });

      const unsubscribe = window.electronAPI.onOpenFileExternal?.((filePath) => {
        if (filePath) {
          loadPdfFromPath(filePath);
        }
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, []);

  // Global Keyboard Shortcuts (Ctrl+K, Ctrl+O, Ctrl+S, Ctrl+W, Ctrl+, Ctrl+H)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // Ctrl + K or Cmd + K: Open / Close Universal Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setIsCommandPaletteOpen((prev) => !prev);
        return;
      }

      // Escape: Close Command Palette if open
      if (e.key === 'Escape') {
        if (isCommandPaletteOpen) {
          e.preventDefault();
          setIsCommandPaletteOpen(false);
          return;
        }
      }

      // If user is typing inside an input/textarea, do not intercept regular editor shortcuts
      if (isInput) return;

      // Ctrl + O: Open PDF file dialog
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        handleOpenFile();
      }
      // Ctrl + S: Save active PDF file
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (currentFile) {
          handleSaveCurrentFile();
        } else {
          showToast('Nenhum documento ativo para salvar.', 'error');
        }
      }
      // Ctrl + W: Close active PDF document
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
        e.preventDefault();
        if (currentFile) {
          setCurrentFile(null);
          showToast('Documento fechado.', 'success');
        }
      }
      // Ctrl + ,: Open Preferences
      else if ((e.ctrlKey || e.metaKey) && (e.key === ',' || e.key === '<')) {
        e.preventDefault();
        setCurrentTool(null);
        setCurrentNav('preferences');
      }
      // Ctrl + H: Go to Home
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setCurrentTool(null);
        setCurrentNav('home');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [currentFile, isCommandPaletteOpen]);

  // Listen to Windows Taskbar JumpList tool launches
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getInitialTool?.().then((toolId) => {
        if (toolId) {
          handleSelectTool(toolId as ToolType);
        }
      });

      const unsubscribe = window.electronAPI.onOpenToolExternal?.((toolId) => {
        if (toolId) {
          handleSelectTool(toolId as ToolType);
        }
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, []);

  // Global Drag and Drop support for PDF files
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file.name.toLowerCase().endsWith('.pdf')) {
          if (window.electronAPI && (file as any).path) {
            loadPdfFromPath((file as any).path);
          } else {
            const data = await file.arrayBuffer();
            const pageCount = await PDFService.getPageCount(data);
            const fileInfo: PDFFileInfo = {
              id: Math.random().toString(),
              name: file.name,
              size: file.size,
              pageCount,
              data,
              lastOpened: Date.now()
            };
            setCurrentFile(fileInfo);
            addToRecents(fileInfo);
            setCurrentNav('tools');
            showToast(`Documento "${file.name}" carregado!`, 'success');
          }
        } else {
          showToast('Por favor, solte um arquivo PDF válido.', 'error');
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleOpenFile = async () => {
    try {
      if (window.electronAPI) {
        const filePaths = await window.electronAPI.openFileDialog({
          multiple: false,
          filters: [{ name: 'Documentos PDF', extensions: ['pdf'] }],
        });

        if (filePaths && filePaths.length > 0) {
          await loadPdfFromPath(filePaths[0]);
        }
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf';
        input.onchange = async (e: any) => {
          const file: File = e.target.files?.[0];
          if (!file) return;
          const data = await file.arrayBuffer();
          const pageCount = await PDFService.getPageCount(data);

          const fileInfo: PDFFileInfo = {
            id: Math.random().toString(),
            name: file.name,
            size: file.size,
            pageCount,
            data,
            lastOpened: Date.now()
          };

          setCurrentFile(fileInfo);
          addToRecents(fileInfo);
          setCurrentTool('reader');
          showToast(`Documento "${file.name}" aberto no Acrobat Studio!`, 'success');
        };
        input.click();
      }
    } catch (err: any) {
      showToast(`Erro ao abrir documento: ${err.message}`, 'error');
    }
  };

  const handleSaveCurrentFile = async () => {
    if (!currentFile) return;
    try {
      if (window.electronAPI) {
        const savePath = await window.electronAPI.saveFileDialog({
          defaultPath: `Copia_${currentFile.name}`,
        });
        if (savePath) {
          await window.electronAPI.writeFile(savePath, currentFile.data);
          recordTask('Salvar Cópia', currentFile.name, 'success');
          showToast(`Arquivo salvo com sucesso em: ${savePath}`, 'success');
        }
      } else {
        const blob = PDFService.createBlob(new Uint8Array(currentFile.data));
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Copia_${currentFile.name}`;
        a.click();
        URL.revokeObjectURL(url);
        recordTask('Download', currentFile.name, 'success');
        showToast('Download do arquivo concluído!', 'success');
      }
    } catch (err: any) {
      showToast(`Erro ao salvar: ${err.message}`, 'error');
    }
  };

  const toolLabels: Record<ToolType, string> = {
    reader: 'Visualizador & Editor ao Vivo (Acrobat Studio)',
    trueedit: 'Editar Texto do PDF (TrueEdit)',
    'ai-chat': 'Chat com PDF & IA (Gemini 2.5)',
    translate: 'Traduzir PDF (Layout Seguro)',
    'contract-audit': 'Auditor de Contratos & Riscos',
    'folder-rag': 'Busca em Pastas (RAG Local)',
    unlock: 'Desbloquear PDF (Remover Restrições)',
    ocr: 'OCR Offline (Reconhecimento de Texto)',
    redact: 'Censurar & Redigir (LGPD)',
    compare: 'Comparar PDFs (Diff Lado a Lado)',
    batch: 'Processamento em Lote (Batch)',
    signature: 'Assinar PDF (Manuscrito)',
    numbering: 'Numeração de Páginas',
    highlight: 'Marca-Texto & Destaques',
    merge: 'Juntar PDFs',
    split: 'Dividir PDF',
    organize: 'Organizar Páginas',
    compress: 'Compactar PDF',
    watermark: 'Marca d\'Água',
    protect: 'Proteger com Senha',
    'pdf-to-img': 'PDF para Imagem',
    'img-to-pdf': 'Imagens para PDF',
    edit: 'Anotar & Notas',
  };

  const handleSelectTool = (tool: ToolType) => {
    setCurrentNav('tools');
    setCurrentTool(tool);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[var(--main-bg)] text-[var(--text-primary)] font-sans transition-colors">
      {/* Collapsible Sidebar (iLovePDF Hub match) */}
      <Sidebar
        currentNav={currentNav}
        onSelectNav={(nav) => {
          setCurrentNav(nav);
          setCurrentTool(null);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Header with Tabs */}
        <TopNav
          currentNav={currentNav}
          onSelectNav={setCurrentNav}
          currentTool={currentTool}
          onCloseTool={() => setCurrentTool(null)}
          currentFile={currentFile}
          onOpenFile={handleOpenFile}
          onSaveCurrentFile={handleSaveCurrentFile}
          onCloseFile={() => setCurrentFile(null)}
          activeToolName={currentTool ? toolLabels[currentTool] : 'Hub'}
          hasUpdateAvailable={hasUpdateAvailable}
          onOpenPreferences={() => {
            setCurrentTool(null);
            setCurrentNav('preferences');
          }}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onStartTour={() => setIsTourOpen(true)}
        />

        {/* Viewport: Either Active Tool or Hub Nav View */}
        <main className="flex-1 flex overflow-hidden relative">
        <GlobalErrorBoundary onResetToHome={() => { setCurrentTool(null); setCurrentNav('home'); }}>
          <Suspense fallback={<ToolLoadingFallback toolName={currentTool ? toolLabels[currentTool] : undefined} />}>
          {/* Active Dedicated Tool Modes */}
          {currentTool === 'reader' && (
            <ReaderView
              file={currentFile}
              onOpenFile={handleOpenFile}
              onShowMessage={showToast}
              onFileUpdated={(newFile) => {
                setCurrentFile(newFile);
                addToRecents(newFile);
                recordTask('Edição ao Vivo (Acrobat Studio)', newFile.name, 'success');
              }}
            />
          )}

          {currentTool === 'trueedit' && (
            <DirectTextEditTool
              currentFile={currentFile}
              onOpenFile={handleOpenFile}
              onShowMessage={showToast}
              onFileUpdated={(newFile) => {
                setCurrentFile(newFile);
                addToRecents(newFile);
                recordTask('TrueEdit', newFile.name, 'success');
              }}
            />
          )}

          {currentTool === 'ai-chat' && (
            <AiChatTool
              currentFile={currentFile}
              onOpenFile={handleOpenFile}
              onShowMessage={showToast}
            />
          )}

          {currentTool === 'translate' && (
            <TranslatorTool
              currentFile={currentFile}
              onOpenFile={handleOpenFile}
              onShowMessage={showToast}
              onFileUpdated={(newFile) => {
                setCurrentFile(newFile);
                addToRecents(newFile);
                recordTask('Tradutor', newFile.name, 'success');
              }}
            />
          )}

          {currentTool === 'contract-audit' && (
            <ContractAuditTool
              currentFile={currentFile}
              onOpenFile={handleOpenFile}
              onShowMessage={showToast}
            />
          )}

          {currentTool === 'folder-rag' && (
            <FolderRagTool
              onLoadFileToApp={(file) => {
                setCurrentFile(file);
                addToRecents(file);
                setCurrentTool('reader');
              }}
              onShowMessage={showToast}
            />
          )}

          {currentTool === 'unlock' && (
            <UnlockTool
              currentFile={currentFile}
              onOpenFile={handleOpenFile}
              onShowMessage={showToast}
              onFileUpdated={(newFile) => {
                setCurrentFile(newFile);
                addToRecents(newFile);
                recordTask('Desbloquear PDF', newFile.name, 'success');
              }}
            />
          )}

          {currentTool === 'ocr' && (
            <OcrTool
              currentFile={currentFile}
              onOpenFile={handleOpenFile}
              onShowMessage={showToast}
            />
          )}

          {currentTool === 'redact' && (
            <RedactTool
              currentFile={currentFile}
              onOpenFile={handleOpenFile}
              onShowMessage={showToast}
              onFileUpdated={(newFile) => {
                setCurrentFile(newFile);
                addToRecents(newFile);
                recordTask('Censura LGPD', newFile.name, 'success');
              }}
            />
          )}

          {currentTool === 'compare' && (
            <CompareTool
              initialFile={currentFile}
              onShowMessage={showToast}
            />
          )}

          {currentTool === 'batch' && (
            <BatchTool />
          )}

          {currentTool === 'signature' && (
            <SignatureTool
              currentFile={currentFile}
              onOpenFile={handleOpenFile}
              onShowMessage={showToast}
              onFileUpdated={(newFile) => {
                setCurrentFile(newFile);
                addToRecents(newFile);
                recordTask('Assinatura', newFile.name, 'success');
              }}
            />
          )}

          {currentTool === 'numbering' && (
            <PageNumberTool
              currentFile={currentFile}
              onOpenFile={handleOpenFile}
              onShowMessage={showToast}
              onFileUpdated={(newFile) => {
                setCurrentFile(newFile);
                addToRecents(newFile);
                recordTask('Numeração', newFile.name, 'success');
              }}
            />
          )}

          {currentTool === 'highlight' && (
            <HighlightTool
              currentFile={currentFile}
              onOpenFile={handleOpenFile}
              onShowMessage={showToast}
              onFileUpdated={(newFile) => {
                setCurrentFile(newFile);
                addToRecents(newFile);
                recordTask('Marca-Texto', newFile.name, 'success');
              }}
            />
          )}

          {currentTool === 'merge' && (
            <MergeTool initialFile={currentFile} onShowMessage={showToast} />
          )}

          {currentTool === 'split' && (
            <SplitTool
              currentFile={currentFile}
              onOpenFile={handleOpenFile}
              onShowMessage={showToast}
            />
          )}

          {currentTool === 'organize' && (
            <OrganizeTool
              currentFile={currentFile}
              onOpenFile={handleOpenFile}
              onShowMessage={showToast}
            />
          )}

          {currentTool === 'compress' && (
            <CompressTool
              currentFile={currentFile}
              onOpenFile={handleOpenFile}
              onShowMessage={showToast}
            />
          )}

          {currentTool === 'watermark' && (
            <WatermarkTool
              currentFile={currentFile}
              onOpenFile={handleOpenFile}
              onShowMessage={showToast}
              onFileUpdated={(newFile) => {
                setCurrentFile(newFile);
                addToRecents(newFile);
                recordTask('Marca d\'Água', newFile.name, 'success');
              }}
            />
          )}

          {currentTool === 'protect' && (
            <ProtectTool
              currentFile={currentFile}
              onOpenFile={handleOpenFile}
              onShowMessage={showToast}
            />
          )}

          {currentTool === 'pdf-to-img' && (
            <ConvertTool
              currentFile={currentFile}
              onOpenFile={handleOpenFile}
              onShowMessage={showToast}
            />
          )}

          {currentTool === 'img-to-pdf' && (
            <ImagesToPdfTool onShowMessage={showToast} />
          )}

          {currentTool === 'edit' && (
            <EditTool
              currentFile={currentFile}
              onOpenFile={handleOpenFile}
              onShowMessage={showToast}
            />
          )}

          {/* Hub Views when no specific tool is active */}
          {!currentTool && currentNav === 'home' && (
            <HomeView
              onOpenFile={handleOpenFile}
              onSelectTool={handleSelectTool}
              recentFiles={recentFiles}
              onStartTour={() => setIsTourOpen(true)}
              onOpenRecent={(f) => {
                setCurrentFile(f);
                setCurrentTool('reader');
              }}
            />
          )}

          {!currentTool && currentNav === 'tools' && (
            <ToolsCatalogView
              onSelectTool={handleSelectTool}
              onOpenPreferences={() => {
                setCurrentTool(null);
                setCurrentNav('preferences');
              }}
            />
          )}

          {!currentTool && currentNav === 'recents' && (
            <RecentsView
              recentFiles={recentFiles}
              onOpenRecent={(f) => {
                setCurrentFile(f);
                setCurrentTool('reader');
              }}
              onClearRecents={() => setRecentFiles([])}
              onOpenFile={handleOpenFile}
            />
          )}

          {!currentTool && currentNav === 'history' && (
            <TaskHistoryView
              history={taskHistory}
              onClearHistory={() => {
                setTaskHistory([]);
                localStorage.removeItem('omnipdf_task_history');
              }}
            />
          )}

          {!currentTool && currentNav === 'preferences' && (
            <PreferencesView onShowMessage={showToast} onStartTour={() => setIsTourOpen(true)} />
          )}

          </Suspense>
        </GlobalErrorBoundary>

        {/* Universal Command Palette (Ctrl + K) */}
        <CommandPaletteModal
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onOpenFile={handleOpenFile}
          onSaveFile={currentFile ? handleSaveCurrentFile : undefined}
          onCloseFile={currentFile ? () => setCurrentFile(null) : undefined}
          onSelectTool={handleSelectTool}
          onSelectNav={(nav) => {
            setCurrentTool(null);
            setCurrentNav(nav);
          }}
          currentFile={currentFile}
          recentFiles={recentFiles}
          onOpenRecent={(f) => {
            setCurrentFile(f);
            setCurrentTool('reader');
          }}
          onToggleTheme={() => {
            const current = ThemeService.getSelectedTheme();
            const next = current.startsWith('dark') ? 'light-pure' : 'dark-slate';
            ThemeService.setSelectedTheme(next);
            showToast(`Tema alterado para: ${next}`, 'success');
          }}
        />

        {/* Interactive App Tour Modal */}
        <AppTourModal
          isOpen={isTourOpen}
          onClose={() => setIsTourOpen(false)}
          onNavigateNav={(nav) => {
            setCurrentTool(null);
            setCurrentNav(nav);
          }}
          onOpenPreferences={() => {
            setCurrentTool(null);
            setCurrentNav('preferences');
          }}
        />

        {/* In-App Auto-Update Modal */}
        <UpdateModal
          isOpen={isUpdateModalOpen}
          onClose={() => setIsUpdateModalOpen(false)}
          updateData={updateInfo}
        />

          {/* Toast Notification */}
          {toast && (
            <div
              className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl border text-xs font-medium transition-all transform animate-in fade-in slide-in-from-bottom-2 duration-200 ${
                toast.type === 'success'
                  ? 'bg-slate-900 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900 border-rose-500/40 text-rose-300'
              }`}
            >
              {toast.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{toast.message}</span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
