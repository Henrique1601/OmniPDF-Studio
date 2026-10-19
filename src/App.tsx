import React, { useState } from 'react';
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
import { ToolType, PDFFileInfo } from './types';
import { PDFService } from './services/pdfService';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [currentTool, setCurrentTool] = useState<ToolType>('reader');
  const [currentFile, setCurrentFile] = useState<PDFFileInfo | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

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

          setCurrentFile({
            id: Math.random().toString(),
            name,
            path: filePath,
            size: data.byteLength,
            pageCount,
            data,
          });
          showToast(`Documento "${name}" carregado com sucesso!`, 'success');
        }
      } else {
        // Web fallback input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf';
        input.onchange = async (e: any) => {
          const file: File = e.target.files?.[0];
          if (!file) return;
          const data = await file.arrayBuffer();
          const pageCount = await PDFService.getPageCount(data);

          setCurrentFile({
            id: Math.random().toString(),
            name: file.name,
            size: file.size,
            pageCount,
            data,
          });
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
    ocr: 'OCR Offline (Reconhecimento de Texto)',
    redact: 'Censurar & Redigir (Privacidade)',
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

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Navigation Sidebar */}
      <Sidebar
        currentTool={currentTool}
        onSelectTool={setCurrentTool}
        hasFile={!!currentFile}
      />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        <TopNav
          currentFile={currentFile}
          onOpenFile={handleOpenFile}
          onSaveCurrentFile={handleSaveCurrentFile}
          onCloseFile={() => setCurrentFile(null)}
          activeToolName={toolLabels[currentTool]}
        />

        {/* Viewport for Active Tool */}
        <main className="flex-1 flex overflow-hidden relative">
          {currentTool === 'reader' && (
            <ReaderView file={currentFile} onOpenFile={handleOpenFile} />
          )}

          {currentTool === 'trueedit' && (
            <DirectTextEditTool
              currentFile={currentFile}
              onOpenFile={handleOpenFile}
              onShowMessage={showToast}
              onFileUpdated={(newFile) => setCurrentFile(newFile)}
            />
          )}

          {currentTool === 'ai-chat' && (
            <AiChatTool
              currentFile={currentFile}
              onOpenFile={handleOpenFile}
              onShowMessage={showToast}
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
              onFileUpdated={(newFile) => setCurrentFile(newFile)}
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
              onFileUpdated={(newFile) => setCurrentFile(newFile)}
            />
          )}

          {currentTool === 'numbering' && (
            <PageNumberTool
              currentFile={currentFile}
              onOpenFile={handleOpenFile}
              onShowMessage={showToast}
              onFileUpdated={(newFile) => setCurrentFile(newFile)}
            />
          )}

          {currentTool === 'highlight' && (
            <HighlightTool
              currentFile={currentFile}
              onOpenFile={handleOpenFile}
              onShowMessage={showToast}
              onFileUpdated={(newFile) => setCurrentFile(newFile)}
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
