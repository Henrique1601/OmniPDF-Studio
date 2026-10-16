import React, { useState } from 'react';
import { Scissors, Download, FileText, CheckCircle2 } from 'lucide-react';
import { PDFFileInfo } from '../../types';
import { PDFService } from '../../services/pdfService';

interface SplitToolProps {
  currentFile: PDFFileInfo | null;
  onOpenFile: () => void;
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
}

export const SplitTool: React.FC<SplitToolProps> = ({ currentFile, onOpenFile, onShowMessage }) => {
  const [pageRangeInput, setPageRangeInput] = useState<string>('1');
  const [processing, setProcessing] = useState<boolean>(false);

  const parsePageRange = (input: string, maxPages: number): number[] => {
    const indexes: Set<number> = new Set();
    const parts = input.split(',').map((p) => p.trim());

    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const start = parseInt(startStr);
        const end = parseInt(endStr);
        if (!isNaN(start) && !isNaN(end)) {
          const from = Math.max(1, Math.min(start, end));
          const to = Math.min(maxPages, Math.max(start, end));
          for (let p = from; p <= to; p++) {
            indexes.add(p - 1); // 0-indexed
          }
        }
      } else {
        const page = parseInt(part);
        if (!isNaN(page) && page >= 1 && page <= maxPages) {
          indexes.add(page - 1);
        }
      }
    }

    return Array.from(indexes).sort((a, b) => a - b);
  };

  const handleSplitAndSave = async () => {
    if (!currentFile) {
      onShowMessage('Abra um PDF primeiro para poder dividi-lo.', 'error');
      return;
    }

    const maxPages = currentFile.pageCount || 1;
    const targetIndices = parsePageRange(pageRangeInput, maxPages);

    if (targetIndices.length === 0) {
      onShowMessage('Especifique um intervalo de páginas válido (ex: 1-3, 5).', 'error');
      return;
    }

    try {
      setProcessing(true);
      const splitBytes = await PDFService.splitPdf(currentFile.data, targetIndices);

      if (window.electronAPI) {
        const savePath = await window.electronAPI.saveFileDialog({
          defaultPath: `Dividido_${currentFile.name}`,
        });
        if (savePath) {
          await window.electronAPI.writeFile(savePath, splitBytes.buffer as ArrayBuffer);
          onShowMessage(`Páginas extraídas com sucesso em: ${savePath}`, 'success');
        }
      } else {
        const blob = PDFService.createBlob(splitBytes);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Dividido_${currentFile.name}`;
        a.click();
        URL.revokeObjectURL(url);
        onShowMessage('Páginas extraídas com sucesso!', 'success');
      }
    } catch (err: any) {
      onShowMessage(`Erro ao dividir PDF: ${err.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (!currentFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-center">
        <Scissors className="w-12 h-12 text-brand-400 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-white mb-2">Selecione um PDF para Dividir</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Escolha o documento que você deseja separar em partes ou extrair páginas específicas.
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

  const parsedPages = parsePageRange(pageRangeInput, currentFile.pageCount || 1);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-8 overflow-y-auto">
      <div className="max-w-2xl w-full mx-auto space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Scissors className="w-6 h-6 text-brand-400" />
            Dividir / Extrair Páginas do PDF
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Extraia uma página específica ou selecione intervalos customizados para criar um novo PDF.
          </p>
        </div>

        {/* Selected Document Info */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
          <FileText className="w-8 h-8 text-brand-400" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{currentFile.name}</h4>
            <p className="text-xs text-slate-400">Total de páginas disponíveis: <strong>{currentFile.pageCount || 1}</strong></p>
          </div>
        </div>

        {/* Range Selection Card */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <label className="block text-xs font-semibold text-slate-300">
            Páginas para Extrair:
          </label>
          <input
            type="text"
            value={pageRangeInput}
            onChange={(e) => setPageRangeInput(e.target.value)}
            placeholder="Exemplo: 1-3, 5, 8-10"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
          />
          <p className="text-[11px] text-slate-400">
            Dica: Use vírgulas para páginas separadas e hífens para intervalos contínuos (ex: <code className="text-brand-300">1-5, 8, 11-14</code>).
          </p>

          <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center justify-between text-xs">
            <span className="text-slate-400">Páginas selecionadas para o novo PDF:</span>
            <span className="font-mono font-bold text-brand-400">
              {parsedPages.length} página(s) [{parsedPages.map((i) => i + 1).join(', ')}]
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSplitAndSave}
            disabled={processing || parsedPages.length === 0}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-sm shadow-xl shadow-brand-600/30 transition-all hover:scale-105 active:scale-95"
          >
            {processing ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Extraindo Páginas...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Extrair e Salvar Novo PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
