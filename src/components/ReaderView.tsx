import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize, 
  FolderOpen,
  Layers,
  Moon,
  Sun
} from 'lucide-react';
import { PDFFileInfo } from '../types';
import { PDFService } from '../services/pdfService';

interface ReaderViewProps {
  file: PDFFileInfo | null;
  onOpenFile: () => void;
}

export const ReaderView: React.FC<ReaderViewProps> = ({ file, onOpenFile }) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (file) {
      setCurrentPage(1);
      setRotation(0);
      PDFService.getPageCount(file.data)
        .then((count) => setTotalPages(count))
        .catch((err) => console.error(err));
    }
  }, [file]);

  useEffect(() => {
    if (!file || !canvasRef.current) return;

    let isCancelled = false;
    setLoading(true);

    PDFService.renderPageToCanvas(
      file.data,
      currentPage,
      canvasRef.current,
      scale,
      rotation
    )
      .then(() => {
        if (!isCancelled) setLoading(false);
      })
      .catch((err) => {
        console.error('Error rendering page:', err);
        if (!isCancelled) setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [file, currentPage, scale, rotation]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 3.0));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950/60">
        <div className="w-20 h-20 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-5 shadow-2xl">
          <FolderOpen className="w-10 h-10 text-brand-400 animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Nenhum Documento Aberto</h2>
        <p className="text-slate-400 text-sm max-w-md mb-6 leading-relaxed">
          Abra qualquer arquivo PDF para leitura rápida, visualização fluida com zoom e navegação em miniaturas.
        </p>
        <button
          onClick={onOpenFile}
          className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm shadow-lg shadow-brand-600/30 transition-all hover:scale-105 active:scale-95"
        >
          Selecionar Arquivo PDF
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950">
      {/* Top Toolbar */}
      <div className="h-12 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 shadow-sm">
        {/* Navigation */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            title="Alternar Miniaturas"
            className={`p-1.5 rounded-lg border transition-colors ${
              showThumbnails
                ? 'bg-brand-500/20 text-brand-400 border-brand-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center space-x-1.5 text-xs text-slate-300 font-mono">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val >= 1 && val <= totalPages) setCurrentPage(val);
              }}
              className="w-12 bg-slate-800 border border-slate-700 rounded px-1.5 py-1 text-center text-white focus:outline-none focus:border-brand-500"
            />
            <span>/ {totalPages}</span>
          </div>

          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* View Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleZoomOut}
            title="Reduzir Zoom"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-300 min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={handleZoomIn}
            title="Aumentar Zoom"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            onClick={handleRotate}
            title="Rotacionar 90°"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setScale(1.0)}
            title="Restaurar Zoom Padrão"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium"
          >
            100%
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? 'Desativar Modo Noturno' : 'Ativar Modo Noturno'}
            className={`p-1.5 rounded-lg border transition-all ${
              isDarkMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Thumbnails Sidebar */}
        {showThumbnails && (
          <aside className="w-48 bg-slate-900/60 border-r border-slate-800/80 overflow-y-auto p-3 space-y-3 shrink-0">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Páginas ({totalPages})
            </div>
            {Array.from({ length: totalPages }).map((_, idx) => {
              const pageNum = idx + 1;
              const isSelected = pageNum === currentPage;
              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-full flex flex-col items-center p-2 rounded-xl transition-all border ${
                    isSelected
                      ? 'bg-brand-500/15 border-brand-500 text-brand-300 shadow-sm'
                      : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="w-full aspect-[3/4] bg-slate-800 rounded flex items-center justify-center font-mono text-xs border border-slate-700/50 mb-1.5">
                    Pág. {pageNum}
                  </div>
                  <span className="text-[11px] font-medium">Página {pageNum}</span>
                </button>
              );
            })}
          </aside>
        )}

        {/* Canvas Display Viewport */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-slate-950/80 relative">
          {loading && (
            <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs shadow-xl">
                <span className="w-3 h-3 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                Renderizando página {currentPage}...
              </div>
            </div>
          )}
          <div
            style={
              isDarkMode
                ? { filter: 'invert(0.92) hue-rotate(180deg) brightness(1.05) contrast(0.95)' }
                : {}
            }
            className="shadow-2xl rounded border border-slate-700/60 bg-white overflow-hidden transition-all duration-200"
          >
            <canvas ref={canvasRef} />
          </div>
        </div>
      </div>
    </div>
  );
};
