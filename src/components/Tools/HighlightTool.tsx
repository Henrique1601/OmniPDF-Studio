import React, { useState, useEffect, useRef } from 'react';
import { 
  Highlighter, 
  Download, 
  Trash2, 
  Check, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  Palette
} from 'lucide-react';
import { PDFFileInfo, DetectedTextItem } from '../../types';
import { PDFService } from '../../services/pdfService';

interface HighlightToolProps {
  currentFile: PDFFileInfo | null;
  onOpenFile: () => void;
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
  onFileUpdated?: (newFile: PDFFileInfo) => void;
}

interface HighlightItem {
  id: string;
  pageNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  colorHex: string;
  text?: string;
}

export const HighlightTool: React.FC<HighlightToolProps> = ({
  currentFile,
  onOpenFile,
  onShowMessage,
  onFileUpdated,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [detectedTexts, setDetectedTexts] = useState<DetectedTextItem[]>([]);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>('#FFEB3B'); // Classic highlighter yellow
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scale = 1.2;

  const colors = [
    { hex: '#FFEB3B', label: 'Amarelo Flúor' },
    { hex: '#4CAF50', label: 'Verde Neon' },
    { hex: '#00BCD4', label: 'Azul Claro' },
    { hex: '#E91E63', label: 'Rosa Choque' },
    { hex: '#FF9800', label: 'Laranja' },
  ];

  useEffect(() => {
    if (currentFile) {
      PDFService.getPageCount(currentFile.data)
        .then((cnt) => setTotalPages(cnt))
        .catch(console.error);
    }
  }, [currentFile]);

  // Load page and detect text
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

  const handleToggleTextHighlight = (textItem: DetectedTextItem) => {
    // Check if already highlighted
    const existingIndex = highlights.findIndex(
      (h) => h.pageNumber === currentPage && h.x === textItem.pdfX && h.y === textItem.pdfY
    );

    if (existingIndex >= 0) {
      // Remove
      setHighlights((prev) => prev.filter((_, i) => i !== existingIndex));
    } else {
      // Add
      const newHl: HighlightItem = {
        id: Math.random().toString(),
        pageNumber: currentPage,
        x: textItem.pdfX,
        y: textItem.pdfY,
        width: textItem.pdfWidth,
        height: textItem.pdfHeight,
        colorHex: selectedColor,
        text: textItem.str,
      };
      setHighlights((prev) => [...prev, newHl]);
    }
  };

  const handleRemove = (id: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  };

  const handleSaveHighlights = async () => {
    if (!currentFile || highlights.length === 0) {
      onShowMessage('Destaque pelo menos um trecho de texto antes de salvar.', 'error');
      return;
    }

    try {
      setSaving(true);
      const highlightedBytes = await PDFService.addHighlights(
        currentFile.data,
        highlights.map((h) => ({
          pageNumber: h.pageNumber,
          x: h.x,
          y: h.y,
          width: h.width,
          height: h.height,
          colorHex: h.colorHex,
          opacity: 0.38,
        }))
      );

      if (window.electronAPI) {
        const savePath = await window.electronAPI.saveFileDialog({
          defaultPath: `Destacado_${currentFile.name}`,
        });
        if (savePath) {
          await window.electronAPI.writeFile(savePath, highlightedBytes.buffer as ArrayBuffer);
          onShowMessage(`PDF com destaques salvo em: ${savePath}`, 'success');
        }
      } else {
        const blob = PDFService.createBlob(highlightedBytes);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Destacado_${currentFile.name}`;
        a.click();
        URL.revokeObjectURL(url);
        onShowMessage('PDF baixado com sucesso!', 'success');
      }

      if (onFileUpdated) {
        onFileUpdated({
          ...currentFile,
          data: highlightedBytes.buffer as ArrayBuffer,
        });
      }
    } catch (err: any) {
      onShowMessage(`Erro ao gravar marcações: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!currentFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-center">
        <Highlighter className="w-12 h-12 text-brand-400 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-white mb-2">Selecione um PDF para Destacar com Marca-Texto</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Destaque trechos importantes com marca-texto fluorescente (amarelo, verde, rosa) diretamente sobre o texto.
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

  const currentPageHighlights = highlights.filter((h) => h.pageNumber === currentPage);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Header */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Highlighter className="w-5 h-5 text-brand-400" />
            <span className="text-sm font-bold text-white">Marca-Texto Inteligente</span>
          </div>

          <div className="flex items-center space-x-1.5 ml-4">
            {colors.map((c) => (
              <button
                key={c.hex}
                onClick={() => setSelectedColor(c.hex)}
                title={c.label}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  selectedColor === c.hex ? 'scale-125 border-white shadow-lg' : 'border-transparent hover:scale-110'
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>

        <button
          onClick={handleSaveHighlights}
          disabled={saving || highlights.length === 0}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all active:scale-95"
        >
          {saving ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Gravando...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Salvar PDF com Destaques ({highlights.length})
            </>
          )}
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Page canvas with interactive clickable highlight text blocks */}
        <div className="flex-1 overflow-auto flex flex-col items-center justify-center p-8 bg-slate-950/90 relative">
          {/* Navigation Controls */}
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
              (Clique em qualquer texto para grifar com a cor selecionada)
            </span>
          </div>

          <div className="relative shadow-2xl rounded border border-slate-700/80 bg-white overflow-hidden">
            <canvas ref={canvasRef} className="block" />

            {/* Overlaid highlight areas */}
            <div className="absolute inset-0 pointer-events-auto">
              {detectedTexts.map((item) => {
                const hl = highlights.find(
                  (h) => h.pageNumber === currentPage && h.x === item.pdfX && h.y === item.pdfY
                );

                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleTextHighlight(item)}
                    title={hl ? 'Clique para remover marcação' : `Clique para grifar: "${item.str}"`}
                    style={{
                      left: `${item.screenLeft}px`,
                      top: `${item.screenTop}px`,
                      width: `${item.screenWidth}px`,
                      height: `${item.screenHeight}px`,
                      backgroundColor: hl ? hl.colorHex : undefined,
                      opacity: hl ? 0.45 : undefined,
                    }}
                    className={`absolute cursor-pointer transition-colors ${
                      hl ? 'ring-1 ring-amber-400' : 'hover:bg-amber-300/30'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Ledger */}
        <aside className="w-72 bg-slate-900 border-l border-slate-800 p-4 flex flex-col h-full shrink-0">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Trechos Grifados ({highlights.length})
            </span>
            {highlights.length > 0 && (
              <button
                onClick={() => setHighlights([])}
                className="text-[11px] text-rose-400 hover:underline"
              >
                Limpar
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-2">
            {highlights.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Clique nos textos do documento ao lado para destacá-los com marca-texto.
              </p>
            ) : (
              highlights.map((h) => (
                <div
                  key={h.id}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: h.colorHex }}
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 block">Pág. {h.pageNumber}</span>
                      <span className="text-slate-200 truncate block text-[11px]">
                        "{h.text || 'Trecho destacado'}"
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(h.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded"
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
