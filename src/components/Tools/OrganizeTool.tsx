import React, { useState, useEffect } from 'react';
import { LayoutGrid, RotateCw, Trash2, ArrowLeft, ArrowRight, Download, FileText } from 'lucide-react';
import { PDFFileInfo } from '../../types';
import { PDFService } from '../../services/pdfService';

interface OrganizeToolProps {
  currentFile: PDFFileInfo | null;
  onOpenFile: () => void;
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
}

interface PageItem {
  id: string;
  originalIndex: number;
  rotation: number;
}

export const OrganizeTool: React.FC<OrganizeToolProps> = ({ currentFile, onOpenFile, onShowMessage }) => {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [processing, setProcessing] = useState<boolean>(false);

  useEffect(() => {
    if (currentFile) {
      const count = currentFile.pageCount || 1;
      const initialPages: PageItem[] = [];
      for (let i = 0; i < count; i++) {
        initialPages.push({
          id: `page-${i}`,
          originalIndex: i,
          rotation: 0,
        });
      }
      setPages(initialPages);
    } else {
      setPages([]);
    }
  }, [currentFile]);

  const handleRotate = (index: number) => {
    setPages((prev) =>
      prev.map((p, i) => (i === index ? { ...p, rotation: (p.rotation + 90) % 360 } : p))
    );
  };

  const handleMove = (index: number, direction: 'left' | 'right') => {
    const target = direction === 'left' ? index - 1 : index + 1;
    if (target < 0 || target >= pages.length) return;
    const updated = [...pages];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    setPages(updated);
  };

  const handleDelete = (index: number) => {
    if (pages.length <= 1) {
      onShowMessage('O documento deve manter pelo menos 1 página.', 'error');
      return;
    }
    setPages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveOrganized = async () => {
    if (!currentFile || pages.length === 0) return;

    try {
      setProcessing(true);
      const organizedBytes = await PDFService.organizePdf(
        currentFile.data,
        pages.map((p) => ({ originalIndex: p.originalIndex, rotation: p.rotation }))
      );

      if (window.electronAPI) {
        const savePath = await window.electronAPI.saveFileDialog({
          defaultPath: `Organizado_${currentFile.name}`,
        });
        if (savePath) {
          await window.electronAPI.writeFile(savePath, organizedBytes.buffer as ArrayBuffer);
          onShowMessage(`PDF reorganizado salvo em: ${savePath}`, 'success');
        }
      } else {
        const blob = PDFService.createBlob(organizedBytes);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Organizado_${currentFile.name}`;
        a.click();
        URL.revokeObjectURL(url);
        onShowMessage('PDF reorganizado com sucesso!', 'success');
      }
    } catch (err: any) {
      onShowMessage(`Erro ao reorganizar PDF: ${err.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (!currentFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-center">
        <LayoutGrid className="w-12 h-12 text-brand-400 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-white mb-2">Selecione um PDF para Organizar</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Gire páginas individuais, altere a ordem ou exclua páginas indesejadas em uma grade visual.
        </p>
        <button
          onClick={onOpenFile}
          className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30"
        >
          Abrir Arquivo PDF
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-6 overflow-y-auto">
      <div className="max-w-6xl w-full mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <LayoutGrid className="w-6 h-6 text-brand-400" />
              Organizar Páginas do PDF
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Reordene, gire 90° ou delete páginas diretamente na grade.
            </p>
          </div>

          <button
            onClick={handleSaveOrganized}
            disabled={processing || pages.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all hover:scale-105 active:scale-95"
          >
            {processing ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Salvar PDF Organizado ({pages.length} pág.)
              </>
            )}
          </button>
        </div>

        {/* Pages Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {pages.map((page, idx) => (
            <div
              key={page.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col items-center group hover:border-slate-700 transition-all shadow-md"
            >
              {/* Page Visual Card */}
              <div
                className="w-full aspect-[3/4] bg-slate-800 rounded-lg flex flex-col items-center justify-center border border-slate-700/60 transition-transform duration-200 relative overflow-hidden"
                style={{ transform: `rotate(${page.rotation}deg)` }}
              >
                <FileText className="w-8 h-8 text-slate-600 mb-1" />
                <span className="font-mono text-xs font-bold text-slate-300">
                  Página {page.originalIndex + 1}
                </span>
                {page.rotation > 0 && (
                  <span className="absolute bottom-1 right-1 text-[9px] font-mono bg-brand-500/20 text-brand-400 px-1 rounded">
                    {page.rotation}°
                  </span>
                )}
              </div>

              {/* Order Label */}
              <div className="w-full flex items-center justify-between mt-2.5 text-xs text-slate-400">
                <span className="font-medium text-slate-300">Posição: #{idx + 1}</span>
                <span className="text-[10px] text-slate-500">Orig. {page.originalIndex + 1}</span>
              </div>

              {/* Actions Toolbar */}
              <div className="w-full flex items-center justify-center gap-1.5 mt-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => handleMove(idx, 'left')}
                  disabled={idx === 0}
                  title="Mover para esquerda"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleRotate(idx)}
                  title="Girar 90 graus"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-brand-400"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleMove(idx, 'right')}
                  disabled={idx === pages.length - 1}
                  title="Mover para direita"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(idx)}
                  title="Excluir esta página"
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 hover:text-rose-400 text-slate-400 transition-colors ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
