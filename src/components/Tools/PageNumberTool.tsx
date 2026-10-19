import React, { useState } from 'react';
import { 
  Hash, 
  Download, 
  FileText, 
  Check, 
  AlignLeft, 
  AlignCenter, 
  AlignRight 
} from 'lucide-react';
import { PDFFileInfo } from '../../types';
import { PDFService } from '../../services/pdfService';

interface PageNumberToolProps {
  currentFile: PDFFileInfo | null;
  onOpenFile: () => void;
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
  onFileUpdated?: (newFile: PDFFileInfo) => void;
}

export const PageNumberTool: React.FC<PageNumberToolProps> = ({
  currentFile,
  onOpenFile,
  onShowMessage,
  onFileUpdated,
}) => {
  const [format, setFormat] = useState<'page-of-total' | 'simple' | 'custom'>('page-of-total');
  const [position, setPosition] = useState<
    'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left'
  >('bottom-center');
  const [startFromPage, setStartFromPage] = useState<number>(1);
  const [fontSize, setFontSize] = useState<number>(10);
  const [margin, setMargin] = useState<number>(30);
  const [customPrefix, setCustomPrefix] = useState<string>('Pág.');
  const [processing, setProcessing] = useState<boolean>(false);

  const handleApplyNumbering = async () => {
    if (!currentFile) return;

    try {
      setProcessing(true);
      const numberedBytes = await PDFService.addPageNumbers(currentFile.data, {
        format,
        position,
        startFromPage,
        fontSize,
        margin,
        prefix: customPrefix,
      });

      if (window.electronAPI) {
        const savePath = await window.electronAPI.saveFileDialog({
          defaultPath: `Numerado_${currentFile.name}`,
        });
        if (savePath) {
          await window.electronAPI.writeFile(savePath, numberedBytes.buffer as ArrayBuffer);
          onShowMessage(`PDF numerado com sucesso em: ${savePath}`, 'success');
        }
      } else {
        const blob = PDFService.createBlob(numberedBytes);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Numerado_${currentFile.name}`;
        a.click();
        URL.revokeObjectURL(url);
        onShowMessage('PDF numerado baixado com sucesso!', 'success');
      }

      if (onFileUpdated) {
        onFileUpdated({
          ...currentFile,
          data: numberedBytes.buffer as ArrayBuffer,
        });
      }
    } catch (err: any) {
      onShowMessage(`Erro ao numerar páginas: ${err.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (!currentFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-center">
        <Hash className="w-12 h-12 text-brand-400 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-white mb-2">Selecione um PDF para Numerar Páginas</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Insira numeração sequencial automática como "Página 1 de 10" em cabeçalhos ou rodapés.
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

  const totalPages = currentFile.pageCount || 1;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-8 overflow-y-auto">
      <div className="max-w-2xl w-full mx-auto space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Hash className="w-6 h-6 text-brand-400" />
            Numeração Automática de Páginas
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure cabeçalhos, rodapés e numerações com precisão e controle de início.
          </p>
        </div>

        {/* File Info */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
          <FileText className="w-8 h-8 text-brand-400" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{currentFile.name}</h4>
            <p className="text-xs text-slate-400">{totalPages} páginas detectadas no documento</p>
          </div>
        </div>

        {/* Options Card */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5">
          {/* Format */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Formato da Numeração:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormat('page-of-total')}
                className={`py-2.5 px-3 rounded-xl text-xs font-medium border text-center transition-all ${
                  format === 'page-of-total'
                    ? 'border-brand-500 bg-brand-500/20 text-white font-semibold'
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                Página 1 de {totalPages}
              </button>
              <button
                type="button"
                onClick={() => setFormat('simple')}
                className={`py-2.5 px-3 rounded-xl text-xs font-medium border text-center transition-all ${
                  format === 'simple'
                    ? 'border-brand-500 bg-brand-500/20 text-white font-semibold'
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                Apenas Número (1)
              </button>
              <button
                type="button"
                onClick={() => setFormat('custom')}
                className={`py-2.5 px-3 rounded-xl text-xs font-medium border text-center transition-all ${
                  format === 'custom'
                    ? 'border-brand-500 bg-brand-500/20 text-white font-semibold'
                    : 'border-slate-700 bg-slate-800 text-slate-400'
                }`}
              >
                Prefixo (Pág. 1)
              </button>
            </div>
          </div>

          {/* Position Matrix */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Posição na Folha:
            </label>
            <div className="border border-slate-700 rounded-xl p-3 bg-slate-950 space-y-2">
              <div className="text-[11px] text-slate-400 font-medium">Cabeçalho (Topo):</div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPosition('top-left')}
                  className={`py-1.5 rounded-lg text-xs border ${
                    position === 'top-left' ? 'bg-brand-500/20 border-brand-500 text-white' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  Topo Esquerda
                </button>
                <button
                  type="button"
                  onClick={() => setPosition('top-center')}
                  className={`py-1.5 rounded-lg text-xs border ${
                    position === 'top-center' ? 'bg-brand-500/20 border-brand-500 text-white' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  Topo Centro
                </button>
                <button
                  type="button"
                  onClick={() => setPosition('top-right')}
                  className={`py-1.5 rounded-lg text-xs border ${
                    position === 'top-right' ? 'bg-brand-500/20 border-brand-500 text-white' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  Topo Direita
                </button>
              </div>

              <div className="text-[11px] text-slate-400 font-medium pt-2">Rodapé (Base):</div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPosition('bottom-left')}
                  className={`py-1.5 rounded-lg text-xs border ${
                    position === 'bottom-left' ? 'bg-brand-500/20 border-brand-500 text-white' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  Rodapé Esquerda
                </button>
                <button
                  type="button"
                  onClick={() => setPosition('bottom-center')}
                  className={`py-1.5 rounded-lg text-xs border ${
                    position === 'bottom-center' ? 'bg-brand-500/20 border-brand-500 text-white' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  Rodapé Centro
                </button>
                <button
                  type="button"
                  onClick={() => setPosition('bottom-right')}
                  className={`py-1.5 rounded-lg text-xs border ${
                    position === 'bottom-right' ? 'bg-brand-500/20 border-brand-500 text-white' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  Rodapé Direita
                </button>
              </div>
            </div>
          </div>

          {/* Start from page and font size */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Iniciar da Página:
              </label>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={startFromPage}
                onChange={(e) => setStartFromPage(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">
                Dica: Digite 2 para não numerar a capa.
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Tamanho da Fonte:</span>
                <span className="font-mono text-slate-400">{fontSize}pt</span>
              </div>
              <input
                type="range"
                min="8"
                max="18"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleApplyNumbering}
            disabled={processing}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-sm shadow-xl shadow-brand-600/30 transition-all hover:scale-105 active:scale-95"
          >
            {processing ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Numerando Páginas...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Aplicar Numeração e Salvar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
