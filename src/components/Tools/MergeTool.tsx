import React, { useState } from 'react';
import { Files, Plus, Trash2, ArrowUp, ArrowDown, Download, CheckCircle, FileText } from 'lucide-react';
import { PDFFileInfo } from '../../types';
import { PDFService } from '../../services/pdfService';

interface MergeToolProps {
  initialFile: PDFFileInfo | null;
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
}

export const MergeTool: React.FC<MergeToolProps> = ({ initialFile, onShowMessage }) => {
  const [fileList, setFileList] = useState<PDFFileInfo[]>(initialFile ? [initialFile] : []);
  const [processing, setProcessing] = useState<boolean>(false);

  const handleAddFiles = async () => {
    try {
      if (window.electronAPI) {
        const paths = await window.electronAPI.openFileDialog({
          multiple: true,
          filters: [{ name: 'Documentos PDF', extensions: ['pdf'] }],
        });

        if (paths && paths.length > 0) {
          const newFiles: PDFFileInfo[] = [];
          for (const p of paths) {
            const data = await window.electronAPI.readFile(p);
            const name = p.split(/[\\/]/).pop() || 'documento.pdf';
            const pageCount = await PDFService.getPageCount(data);
            newFiles.push({
              id: Math.random().toString(),
              name,
              path: p,
              size: data.byteLength,
              pageCount,
              data,
            });
          }
          setFileList((prev) => [...prev, ...newFiles]);
        }
      } else {
        // Fallback para Web file input
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'application/pdf';
        input.onchange = async (e: any) => {
          const files: FileList = e.target.files;
          const newFiles: PDFFileInfo[] = [];
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const data = await file.arrayBuffer();
            const pageCount = await PDFService.getPageCount(data);
            newFiles.push({
              id: Math.random().toString(),
              name: file.name,
              size: file.size,
              pageCount,
              data,
            });
          }
          setFileList((prev) => [...prev, ...newFiles]);
        };
        input.click();
      }
    } catch (err: any) {
      onShowMessage(`Erro ao carregar arquivos: ${err.message}`, 'error');
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fileList.length) return;
    const updated = [...fileList];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setFileList(updated);
  };

  const handleRemove = (index: number) => {
    setFileList((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMergeAndSave = async () => {
    if (fileList.length < 2) {
      onShowMessage('Adicione pelo menos 2 arquivos PDF para unificar.', 'error');
      return;
    }

    try {
      setProcessing(true);
      const buffers = fileList.map((f) => f.data);
      const mergedBytes = await PDFService.mergePdfs(buffers);

      if (window.electronAPI) {
        const savePath = await window.electronAPI.saveFileDialog({
          defaultPath: 'PDF_Unificado.pdf',
        });
        if (savePath) {
          await window.electronAPI.writeFile(savePath, mergedBytes.buffer as ArrayBuffer);
          onShowMessage(`PDFs unidos com sucesso em: ${savePath}`, 'success');
        }
      } else {
        // Fallback download no browser
        const blob = PDFService.createBlob(mergedBytes);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'PDF_Unificado.pdf';
        a.click();
        URL.revokeObjectURL(url);
        onShowMessage('PDFs unificados com sucesso!', 'success');
      }
    } catch (err: any) {
      onShowMessage(`Erro ao juntar PDFs: ${err.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-8 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        {/* Header */}
        <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <Files className="w-6 h-6 text-brand-400" />
              Juntar Arquivos PDF (Merge)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Combine múltiplos documentos PDF em um único arquivo de forma rápida e na ordem que desejar.
            </p>
          </div>

          <button
            onClick={handleAddFiles}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 text-brand-400" />
            Adicionar Mais PDFs
          </button>
        </div>

        {/* Files List */}
        {fileList.length === 0 ? (
          <div className="border-2 border-dashed border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
            <Files className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">Nenhum PDF selecionado</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">Adicione dois ou mais arquivos para juntá-los.</p>
            <button
              onClick={handleAddFiles}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold"
            >
              Escolher PDFs
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {fileList.map((file, idx) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                    {idx + 1}
                  </span>
                  <FileText className="w-5 h-5 text-brand-400" />
                  <div>
                    <h4 className="text-sm font-medium text-slate-200">{file.name}</h4>
                    <p className="text-[11px] text-slate-400">
                      {(file.size / 1024).toFixed(1)} KB • {file.pageCount || 0} páginas
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleMove(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                    title="Mover para cima"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMove(idx, 'down')}
                    disabled={idx === fileList.length - 1}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                    title="Mover para baixo"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemove(idx)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 hover:text-rose-400 text-slate-400 transition-colors ml-1"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Button */}
        {fileList.length > 0 && (
          <div className="pt-4 flex justify-end">
            <button
              onClick={handleMergeAndSave}
              disabled={processing || fileList.length < 2}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-sm shadow-xl shadow-brand-600/30 transition-all hover:scale-105 active:scale-95"
            >
              {processing ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Unificando PDFs...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Juntar PDFs e Salvar
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
