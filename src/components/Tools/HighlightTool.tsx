import React, { useState, useEffect, useRef } from 'react';
import { 
  Highlighter, 
  Download, 
  Trash2, 
  Check, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  Palette,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  MousePointer
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
  // Screen bounding box for live rendering
  screenLeft?: number;
  screenTop?: number;
  screenWidth?: number;
  screenHeight?: number;
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
  const [selectedColor, setSelectedColor] = useState<string>('#FFEB3B'); // Fluorescent yellow
  const [scale, setScale] = useState<number>(0.95); // Optimal fit on laptop/desktop
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Drag selection state for freehand highlight box
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const colors = [
    { hex: '#FFEB3B', label: 'Amarelo Flúor' },
    { hex: '#4CAF50', label: 'Verde Neon' },
    { hex: '#00BCD4', label: 'Azul Claro' },
    { hex: '#E91E63', label: 'Rosa Choque' },
    { hex: '#FF9800', label: 'Laranja' },
    { hex: '#9C27B0', label: 'Roxo Claro' },
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

    let isCancelled = false;
    const load = async () => {
      try {
        if (!canvasRef.current) return;
        await PDFService.renderPageToCanvas(currentFile.data, currentPage, canvasRef.current, scale);
        const texts = await PDFService.extractPageTextItems(currentFile.data, currentPage, scale);
        if (!isCancelled) {
          setDetectedTexts(texts);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (!isCancelled) setLoading(false);
      }
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, [currentFile, currentPage, scale]);

  const handleToggleTextHighlight = (textItem: DetectedTextItem) => {
    // Check if already highlighted
    const existingIndex = highlights.findIndex(
      (h) => h.pageNumber === currentPage && Math.abs(h.x - textItem.pdfX) < 2 && Math.abs(h.y - textItem.pdfY) < 2
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
        screenLeft: textItem.screenLeft,
        screenTop: textItem.screenTop,
        screenWidth: textItem.screenWidth,
        screenHeight: textItem.screenHeight,
      };
      setHighlights((prev) => [...prev, newHl]);
    }
  };

  // Freehand Drag-to-Highlight handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDragging(true);
    setDragStart({ x, y });
    setDragCurrent({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
    setDragCurrent({ x, y });
  };

  const handleMouseUp = () => {
    if (!isDragging || !dragStart || !dragCurrent || !canvasRef.current) {
      setIsDragging(false);
      setDragStart(null);
      setDragCurrent(null);
      return;
    }

    const screenX = Math.min(dragStart.x, dragCurrent.x);
    const screenY = Math.min(dragStart.y, dragCurrent.y);
    const screenW = Math.abs(dragCurrent.x - dragStart.x);
    const screenH = Math.abs(dragCurrent.y - dragStart.y);

    // If drag was meaningful (> 8px)
    if (screenW > 8 && screenH > 8) {
      const canvasH = canvasRef.current.height;
      const pdfX = screenX / scale;
      const pdfY = (canvasH - (screenY + screenH)) / scale;
      const pdfWidth = screenW / scale;
      const pdfHeight = screenH / scale;

      const newHl: HighlightItem = {
        id: Math.random().toString(),
        pageNumber: currentPage,
        x: pdfX,
        y: pdfY,
        width: pdfWidth,
        height: pdfHeight,
        colorHex: selectedColor,
        text: `Destaque livre (${Math.round(pdfWidth)}x${Math.round(pdfHeight)} pt)`,
        screenLeft: screenX,
        screenTop: screenY,
        screenWidth: screenW,
        screenHeight: screenH,
      };

      setHighlights((prev) => [...prev, newHl]);
    }

    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
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
          Destaque trechos importantes com marca-texto fluorescente (amarelo, verde, rosa) diretamente sobre o texto ou arrastando o mouse livremente.
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

  // Active drag box calculation
  const dragBox = isDragging && dragStart && dragCurrent ? {
    left: Math.min(dragStart.x, dragCurrent.x),
    top: Math.min(dragStart.y, dragCurrent.y),
    width: Math.abs(dragCurrent.x - dragStart.x),
    height: Math.abs(dragCurrent.y - dragStart.y),
  } : null;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Header */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Highlighter className="w-5 h-5 text-brand-400" />
            <span className="text-sm font-bold text-white">Marca-Texto Inteligente</span>
          </div>

          {/* Color Palettes */}
          <div className="flex items-center space-x-1.5 ml-2 border-l border-slate-800 pl-3">
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

          {/* Zoom / Fit Controls */}
          <div className="flex items-center space-x-1 border-l border-slate-800 pl-3">
            <button
              onClick={() => setScale((s) => Math.max(0.5, s - 0.15))}
              title="Reduzir Zoom (-)"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-300 min-w-[42px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
              title="Aumentar Zoom (+)"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setScale(0.85)}
              title="Ajustar à Página Inteira"
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-medium"
            >
              Ajustar
            </button>
            <button
              onClick={() => setScale(1.0)}
              title="Tamanho 100%"
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-medium"
            >
              100%
            </button>
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
        {/* Left Side: Page canvas with interactive clickable + drag selection */}
        {/* IMPORTANT: justify-start with py-8 prevents vertical clipping of tall pages */}
        <div className="flex-1 overflow-auto flex flex-col items-center justify-start p-6 bg-slate-950/95 relative">
          {/* Navigation Controls */}
          <div className="mb-4 flex items-center space-x-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl shadow-lg shrink-0">
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
            <span className="text-[11px] text-slate-400 ml-2 border-l border-slate-800 pl-3">
              Dica: <strong>Clique</strong> nas palavras ou <strong>arraste</strong> o mouse para grifar qualquer região livremente.
            </span>
          </div>

          {/* Canvas Wrapper */}
          <div className="relative shadow-2xl rounded border border-slate-700/80 bg-white overflow-hidden shrink-0">
            {loading && (
              <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-20">
                <span className="w-6 h-6 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
              </div>
            )}

            <canvas ref={canvasRef} className="block" />

            {/* Interactive Overlay Layer: Text clicks + Freehand drag */}
            <div
              ref={overlayRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className="absolute inset-0 cursor-crosshair select-none"
            >
              {/* Overlaid detected text items */}
              {detectedTexts.map((item) => {
                const hl = highlights.find(
                  (h) => h.pageNumber === currentPage && Math.abs(h.x - item.pdfX) < 2 && Math.abs(h.y - item.pdfY) < 2
                );

                return (
                  <div
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleTextHighlight(item);
                    }}
                    title={hl ? 'Clique para remover marcação' : `Clique para grifar: "${item.str}"`}
                    style={{
                      left: `${item.screenLeft}px`,
                      top: `${item.screenTop}px`,
                      width: `${item.screenWidth}px`,
                      height: `${item.screenHeight}px`,
                      backgroundColor: hl ? hl.colorHex : undefined,
                      opacity: hl ? 0.42 : undefined,
                    }}
                    className={`absolute cursor-pointer transition-colors ${
                      hl ? 'ring-1 ring-amber-400' : 'hover:bg-amber-300/25'
                    }`}
                  />
                );
              })}

              {/* Freehand Highlight Items rendered on this page */}
              {highlights
                .filter((h) => h.pageNumber === currentPage && h.screenLeft !== undefined)
                .map((h) => (
                  <div
                    key={h.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(h.id);
                    }}
                    title="Clique para remover destaque"
                    style={{
                      left: `${h.screenLeft}px`,
                      top: `${h.screenTop}px`,
                      width: `${h.screenWidth}px`,
                      height: `${h.screenHeight}px`,
                      backgroundColor: h.colorHex,
                      opacity: 0.42,
                    }}
                    className="absolute cursor-pointer border border-amber-400/50 hover:opacity-75 transition-opacity"
                  />
                ))}

              {/* Live Dragging Rectangle Preview */}
              {dragBox && (
                <div
                  style={{
                    left: `${dragBox.left}px`,
                    top: `${dragBox.top}px`,
                    width: `${dragBox.width}px`,
                    height: `${dragBox.height}px`,
                    backgroundColor: selectedColor,
                    opacity: 0.45,
                  }}
                  className="absolute pointer-events-none border-2 border-dashed border-amber-500 animate-pulse"
                />
              )}
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
                Limpar Todos
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto py-3 space-y-2">
            {highlights.length === 0 ? (
              <div className="text-center py-8 px-2 space-y-2">
                <MousePointer className="w-6 h-6 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">
                  Clique nos textos ou arraste o mouse sobre a página ao lado para destacar trechos.
                </p>
              </div>
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
                        "{h.text || 'Destaque'}"
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemove(h.id)}
                    title="Excluir destaque"
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
