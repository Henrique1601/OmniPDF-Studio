import React, { useState, useEffect, useRef } from 'react';
import { 
  EyeOff, 
  Download, 
  Trash2, 
  Check, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  ShieldAlert, 
  Sparkles,
  Search
} from 'lucide-react';
import { PDFFileInfo, DetectedTextItem } from '../../types';
import { PDFService } from '../../services/pdfService';

interface RedactToolProps {
  currentFile: PDFFileInfo | null;
  onOpenFile: () => void;
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
  onFileUpdated?: (newFile: PDFFileInfo) => void;
}

interface RedactionArea {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  overlayText?: string;
}

export const RedactTool: React.FC<RedactToolProps> = ({
  currentFile,
  onOpenFile,
  onShowMessage,
  onFileUpdated,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [detectedTexts, setDetectedTexts] = useState<DetectedTextItem[]>([]);
  const [redactions, setRedactions] = useState<RedactionArea[]>([]);
  const [overlayStyle, setOverlayStyle] = useState<'solid' | 'confidential'>('solid');
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scale = 1.2;

  useEffect(() => {
    if (currentFile) {
      PDFService.getPageCount(currentFile.data)
        .then((cnt) => setTotalPages(cnt))
        .catch(console.error);
    }
  }, [currentFile]);

  useEffect(() => {
    if (!currentFile || !canvasRef.current) return;
    setLoading(true);

    const load = async () => {
      try {
        if (!canvasRef.current) return;
        await PDFService.renderPageToCanvas(currentFile.data, currentPage, canvasRef.current, scale);
        const texts = await PDFService.extractPageTextItems(currentFile.data, currentPage, scale);
        setDetectedTexts(texts);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };

    load();
  }, [currentFile, currentPage]);

  const handleToggleRedact = (item: DetectedTextItem) => {
    const existingIndex = redactions.findIndex(
      (r) => r.pageNumber === currentPage && r.x === item.pdfX && r.y === item.pdfY
    );

    if (existingIndex >= 0) {
      setRedactions((prev) => prev.filter((_, i) => i !== existingIndex));
    } else {
      const newR: RedactionArea = {
        id: Math.random().toString(),
        pageNumber: currentPage,
        x: item.pdfX,
        y: item.pdfY,
        width: item.pdfWidth,
        height: item.pdfHeight,
        text: item.str,
        overlayText: overlayStyle === 'confidential' ? 'CONFIDENCIAL' : undefined,
      };
      setRedactions((prev) => [...prev, newR]);
    }
  };

  const handleAutoDetectSensitive = () => {
    // Regex for CPF, email, phone numbers
    const cpfRegex = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/;
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phoneRegex = /\b\(?\d{2}\)?\s?\d{4,5}-?\d{4}\b/;

    const matches: DetectedTextItem[] = detectedTexts.filter((t) => {
      return cpfRegex.test(t.str) || emailRegex.test(t.str) || phoneRegex.test(t.str);
    });

    if (matches.length === 0) {
      onShowMessage('Nenhum dado sensível padrão (CPF, e-mail, telefone) detectado automaticamente nesta página.', 'error');
      return;
    }

    const newRedactions: RedactionArea[] = matches.map((item) => ({
      id: Math.random().toString(),
      pageNumber: currentPage,
      x: item.pdfX,
      y: item.pdfY,
      width: item.pdfWidth,
      height: item.pdfHeight,
      text: item.str,
      overlayText: overlayStyle === 'confidential' ? 'CONFIDENCIAL' : undefined,
    }));

    setRedactions((prev) => {
      const existingKeys = new Set(prev.map((r) => `${r.pageNumber}-${r.x}-${r.y}`));
      const unique = newRedactions.filter((nr) => !existingKeys.has(`${nr.pageNumber}-${nr.x}-${nr.y}`));
      return [...prev, ...unique];
    });

    onShowMessage(`${matches.length} dado(s) sensível(is) detectado(s) e marcado(s) para censura!`, 'success');
  };

  const handleApplyRedactions = async () => {
    if (!currentFile || redactions.length === 0) {
      onShowMessage('Marque pelo menos um dado para censurar antes de salvar.', 'error');
      return;
    }

    try {
      setSaving(true);
      const redactedBytes = await PDFService.applyRedactions(
        currentFile.data,
        redactions.map((r) => ({
          pageNumber: r.pageNumber,
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
          overlayText: r.overlayText,
        }))
      );

      if (window.electronAPI) {
        const savePath = await window.electronAPI.saveFileDialog({
          defaultPath: `Censurado_${currentFile.name}`,
        });
        if (savePath) {
          await window.electronAPI.writeFile(savePath, redactedBytes.buffer as ArrayBuffer);
          onShowMessage(`PDF com censura definitiva salvo em: ${savePath}`, 'success');
        }
      } else {
        const blob = PDFService.createBlob(redactedBytes);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Censurado_${currentFile.name}`;
        a.click();
        URL.revokeObjectURL(url);
        onShowMessage('PDF censurado baixado com sucesso!', 'success');
      }

      if (onFileUpdated) {
        onFileUpdated({
          ...currentFile,
          data: redactedBytes.buffer as ArrayBuffer,
        });
      }
    } catch (err: any) {
      onShowMessage(`Erro ao aplicar censura: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!currentFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-center">
        <EyeOff className="w-12 h-12 text-brand-400 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-white mb-2">Selecione um PDF para Censurar Dados Sensíveis</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Apague permanentemente CPFs, telefones, números de conta e segredos do documento antes de compartilhá-lo.
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
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Header */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <EyeOff className="w-5 h-5 text-rose-400" />
            <span className="text-sm font-bold text-white">Censura & Redação Permanente</span>
          </div>

          <button
            onClick={handleAutoDetectSensitive}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-brand-300 text-xs border border-slate-700 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            Auto-Detectar CPFs & E-mails
          </button>
        </div>

        <button
          onClick={handleApplyRedactions}
          disabled={saving || redactions.length === 0}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white text-xs font-semibold shadow-lg shadow-rose-600/30 transition-all active:scale-95"
        >
          {saving ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Sanitizando...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Aplicar Censura Definitiva ({redactions.length})
            </>
          )}
        </button>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas Display */}
        <div className="flex-1 overflow-auto flex flex-col items-center justify-center p-8 bg-slate-950/90 relative">
          {/* Page Picker Toolbar */}
          <div className="mb-4 flex items-center space-x-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl shadow-lg">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs text-white">Página {currentPage} de {totalPages}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-[11px] text-slate-400 ml-2">
              (Clique em qualquer texto para aplicar a tarja preta de censura)
            </span>
          </div>

          <div className="relative shadow-2xl rounded border border-slate-700/80 bg-white overflow-hidden">
            <canvas ref={canvasRef} className="block" />

            {/* Overlaid Redaction blocks */}
            <div className="absolute inset-0 pointer-events-auto">
              {detectedTexts.map((item) => {
                const isRedacted = redactions.some(
                  (r) => r.pageNumber === currentPage && r.x === item.pdfX && r.y === item.pdfY
                );

                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleRedact(item)}
                    title={isRedacted ? 'Clique para remover censura' : `Clique para censurar: "${item.str}"`}
                    style={{
                      left: `${item.screenLeft}px`,
                      top: `${item.screenTop}px`,
                      width: `${item.screenWidth}px`,
                      height: `${item.screenHeight}px`,
                    }}
                    className={`absolute cursor-pointer transition-all duration-150 flex items-center justify-center ${
                      isRedacted
                        ? 'bg-black text-white font-mono text-[9px] font-bold shadow-lg border border-red-500'
                        : 'hover:bg-red-500/25 hover:border hover:border-red-500/80'
                    }`}
                  >
                    {isRedacted && (
                      <span className="select-none text-[8px] text-red-400">TARJADO</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Ledger */}
        <aside className="w-80 bg-slate-900 border-l border-slate-800 p-4 flex flex-col h-full shrink-0">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Itens Censurados ({redactions.length})
            </span>
            {redactions.length > 0 && (
              <button
                onClick={() => setRedactions([])}
                className="text-[11px] text-rose-400 hover:underline"
              >
                Limpar
              </button>
            )}
          </div>

          <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-xl my-3 text-[11px] text-rose-300 leading-relaxed">
            🛡️ <strong>Segurança Absoluta:</strong> A censura do OmniPDF Studio apaga permanentemente o conteúdo binário, impedindo que os dados sejam revelados por seleção ou cópia.
          </div>

          <div className="flex-1 overflow-y-auto space-y-2">
            {redactions.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">
                Nenhum dado marcado. Clique nos textos do documento ou use a detecção automática acima.
              </p>
            ) : (
              redactions.map((r) => (
                <div
                  key={r.id}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-400 block font-mono">Página {r.pageNumber}</span>
                    <span className="text-rose-400 truncate block text-[11px] font-mono">
                      "{r.text}"
                    </span>
                  </div>
                  <button
                    onClick={() => setRedactions((prev) => prev.filter((item) => item.id !== r.id))}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded"
                    title="Remover censura"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
