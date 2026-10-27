import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { TopNav } from './components/TopNav';
import { ReaderView } from './components/ReaderView';
import { MergeTool } from './components/Tools/MergeTool';
import { SplitTool } from './components/Tools/SplitTool';
import { OrganizeTool } from './components/Tools/OrganizeTool';
import { CompressTool } from './components/Tools/CompressTool';
import { WatermarkTool } from './components/Tools/WatermarkTool';
import { ProtectTool } from './components/Tools/ProtectTool';
import { ConvertTool } from './components/Tools/ConvertTool';
import { ImagesToPdfTool } from './components/Tools/ImagesToPdfTool';
import { EditTool } from './components/Tools/EditTool';
import { DirectTextEditTool } from './components/Tools/DirectTextEditTool';
import { SignatureTool } from './components/Tools/SignatureTool';
import { PageNumberTool } from './components/Tools/PageNumberTool';
import { HighlightTool } from './components/Tools/HighlightTool';
import { AiChatTool } from './components/Tools/AiChatTool';
import { OcrTool } from './components/Tools/OcrTool';
import { RedactTool } from './components/Tools/RedactTool';
import { CompareTool } from './components/Tools/CompareTool';
import { BatchTool } from './components/Tools/BatchTool';
import { UnlockTool } from './components/Tools/UnlockTool';
import { TranslatorTool } from './components/Tools/TranslatorTool';
import { ContractAuditTool } from './components/Tools/ContractAuditTool';
import { FolderRagTool } from './components/Tools/FolderRagTool';

import { ToolsCatalogView } from './components/Views/ToolsCatalogView';
import { HomeView } from './components/Views/HomeView';
import { RecentsView } from './components/Views/RecentsView';
import { TaskHistoryView } from './components/Views/TaskHistoryView';
import { PreferencesView } from './components/Views/PreferencesView';
import { UpdateModal } from './components/Common/UpdateModal';

import { ToolType, AppNavMode, PDFFileInfo, TaskHistoryItem } from './types';
import { PDFService } from './services/pdfService';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [currentNav, setCurrentNav] = useState<AppNavMode>('tools');
  const [currentTool, setCurrentTool] = useState<ToolType | null>(null);
  const [currentFile, setCurrentFile] = useState<PDFFileInfo | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [hasUpdateAvailable, setHasUpdateAvailable] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
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

  useEffect(() => {
    // Check auto update listener
    if (window.electronAPI?.onUpdaterStatus) {
      const unsubscribe = window.electronAPI.onUpdaterStatus((data) => {
        if (data.status === 'available') {
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
      return () => unsubscribe();
    }
  }, []);

  const handleOpenFile = async () => {
    try {
      if (window.electronAPI) {
        const filePaths = await window.electronAPI.openFileDialog({
          multiple: false,
          filters: [{ name: 'Documentos PDF', extensions: ['pdf'] }],
        });

        if (filePaths && filePaths.length > 0) {
          const filePath = filePaths[0];
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
          showToast(`Documento "${name}" carregado com sucesso!`, 'success');
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
          showToast(`Documento "${file.name}" carregado!`, 'success');
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
    reader: 'Leitor e Visualizador de PDF',
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
    setCurrentTool(tool);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#090d16] text-slate-100 font-sans">
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
          onOpenPreferences={() => setIsUpdateModalOpen(true)}
        />

        {/* Viewport: Either Active Tool or Hub Nav View */}
        <main className="flex-1 flex overflow-hidden relative">
          {/* Active Dedicated Tool Modes */}
          {currentTool === 'reader' && (
            <ReaderView file={currentFile} onOpenFile={handleOpenFile} />
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
            <PreferencesView onShowMessage={showToast} />
          )}

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
