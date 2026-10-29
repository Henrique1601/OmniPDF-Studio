import React, { useState } from 'react';
import { 
  ScanText, 
  Download, 
  Copy, 
  Check, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles,
  Languages
} from 'lucide-react';
import { PDFFileInfo } from '../../types';
import { PDFService } from '../../services/pdfService';
import { createWorker } from 'tesseract.js';

interface OcrToolProps {
  currentFile: PDFFileInfo | null;
  onOpenFile: () => void;
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
}

export const OcrTool: React.FC<OcrToolProps> = ({ currentFile, onOpenFile, onShowMessage }) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [lang, setLang] = useState<string>('por');
  const [ocrText, setOcrText] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>('');
  const [processing, setProcessing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const totalPages = currentFile?.pageCount || 1;

  const handleRunOcr = async () => {
    if (!currentFile) return;

    try {
      setProcessing(true);
      setProgress(10); window.electronAPI?.setProgressBar?.(0.1);
      setStatusText('Renderizando imagem de alta definição da página...');

      // Render high quality page image (scale 2.5)
      const pageDataUrl = await PDFService.exportPageAsImage(
        currentFile.data,
        currentPage,
        'image/png',
        1.0,
        2.5
      );

      setProgress(25); window.electronAPI?.setProgressBar?.(0.25);
      setStatusText(`Inicializando motor OCR (${lang.toUpperCase()})...`);

      const worker = await createWorker(lang);
      const ret = await worker.recognize(pageDataUrl, {}, { blocks: true });
      setOcrText(ret.data.text || '');
      await worker.terminate();

      setProgress(100); window.electronAPI?.setProgressBar?.(-1);
      setStatusText('Concluído!');
      onShowMessage(`OCR da página ${currentPage} finalizado com sucesso!`, 'success');
    } catch (err: any) {
      console.error(err);
      onShowMessage(`Erro durante OCR: ${err.message}`, 'error');
    } finally {
      setProcessing(false);
      window.electronAPI?.setProgressBar?.(-1);
    }
  };

  const handleCopy = () => {
    if (!ocrText) return;
    navigator.clipboard.writeText(ocrText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onShowMessage('Texto copiado para a área de transferência!', 'success');
  };

  const handleExportTxt = async () => {
    if (!ocrText || !currentFile) return;

    const fileName = `${currentFile.name.replace(/\.pdf$/i, '')}_p${currentPage}_OCR.txt`;

    if (window.electronAPI) {
      const savePath = await window.electronAPI.saveFileDialog({
        defaultPath: fileName,
        filters: [{ name: 'Arquivo de Texto (.txt)', extensions: ['txt'] }],
      });
      if (savePath) {
        const encoder = new TextEncoder();
        await window.electronAPI.writeFile(savePath, encoder.encode(ocrText).buffer as ArrayBuffer);
        onShowMessage(`Texto OCR salvo em: ${savePath}`, 'success');
      }
    } else {
      const blob = new Blob([ocrText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      onShowMessage('Download do texto OCR concluído!', 'success');
    }
  };

  if (!currentFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-center">
        <ScanText className="w-12 h-12 text-brand-400 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-white mb-2">Selecione um PDF para Reconhecimento OCR</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Converta PDFs escaneados, contratos fotografados e notas fiscais em texto digital pesquisável e editável.
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
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-8 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <ScanText className="w-6 h-6 text-brand-400" />
              OCR Offline (Reconhecimento Óptico de Caracteres)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Extraia texto de páginas digitalizadas e fotos de documentos sem depender de internet.
            </p>
          </div>

          <span className="text-xs font-semibold bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Motor Tesseract Local
          </span>
        </div>

        {/* Configuration Bar */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          {/* Page Picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Página para OCR:</span>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || processing}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs text-white px-2">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || processing}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Language Selector */}
          <div className="flex items-center gap-2">
            <Languages className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-400">Idioma do Documento:</span>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value)}
              disabled={processing}
              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
            >
              <option value="por">Português (Brasil)</option>
              <option value="eng">Inglês (English)</option>
              <option value="spa">Espanhol (Español)</option>
            </select>
          </div>

          {/* Start OCR Action */}
          <button
            onClick={handleRunOcr}
            disabled={processing}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all hover:scale-105 active:scale-95"
          >
            {processing ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Extrair Texto da Página {currentPage}
              </>
            )}
          </button>
        </div>

        {/* Progress Display */}
        {processing && (
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs text-slate-300 font-medium">
              <span>{statusText}</span>
              <span className="font-mono text-brand-400">{progress}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-600 to-amber-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* OCR Result Viewport */}
        {ocrText ? (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden flex flex-col shadow-xl">
            <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300">
                Texto Reconhecido da Página {currentPage} ({ocrText.length} caracteres)
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado!' : 'Copiar Texto'}
                </button>

                <button
                  onClick={handleExportTxt}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-brand-400" />
                  Salvar em .TXT
                </button>
              </div>
            </div>

            <textarea
              readOnly
              value={ocrText}
              rows={14}
              className="w-full p-4 bg-slate-950/90 text-slate-200 text-xs font-mono leading-relaxed resize-none focus:outline-none"
            />
          </div>
        ) : (
          <div className="p-12 border-2 border-dashed border-slate-800 rounded-2xl text-center text-xs text-slate-500">
            Clique em "Extrair Texto" para rodar o reconhecimento óptico de caracteres na página selecionada.
          </div>
        )}
      </div>
    </div>
  );
};
