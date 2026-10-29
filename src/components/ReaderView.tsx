import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  FolderOpen,
  Layers,
  Moon,
  Sun,
  Hand,
  Type,
  Highlighter,
  ShieldAlert,
  PenTool,
  Droplet,
  Save,
  Trash2,
  Check,
  X,
  Sparkles,
  Move,
  CornerUpLeft
} from 'lucide-react';
import { PDFFileInfo, DetectedTextItem } from '../types';
import { PDFService } from '../services/pdfService';

interface ReaderViewProps {
  file: PDFFileInfo | null;
  onOpenFile: () => void;
  onShowMessage?: (msg: string, type?: 'success' | 'error') => void;
  onFileUpdated?: (newFile: PDFFileInfo) => void;
}

type AcrobatToolMode = 'pan' | 'text' | 'highlight' | 'redact' | 'signature' | 'watermark';

interface LiveTextItem {
  id: string;
  pageNumber: number;
  text: string;
  screenX: number;
  screenY: number;
  size: number;
  colorHex: string;
}

interface LiveHighlightItem {
  id: string;
  pageNumber: number;
  screenX: number;
  screenY: number;
  screenWidth: number;
  screenHeight: number;
  colorHex: string;
  opacity: number;
}

interface LiveRedactionItem {
  id: string;
  pageNumber: number;
  screenX: number;
  screenY: number;
  screenWidth: number;
  screenHeight: number;
}

interface LiveSignatureItem {
  id: string;
  pageNumber: number;
  dataUrl: string;
  screenX: number;
  screenY: number;
  screenWidth: number;
  screenHeight: number;
}

export const ReaderView: React.FC<ReaderViewProps> = ({ 
  file, 
  onOpenFile, 
  onShowMessage,
  onFileUpdated 
}) => {
  // Navigation & View state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [detectedTexts, setDetectedTexts] = useState<DetectedTextItem[]>([]);
  const [scale, setScale] = useState<number>(1.05);
  const [rotation, setRotation] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [showThumbnails, setShowThumbnails] = useState<boolean>(true);

  // Active Acrobat Tool Mode
  const [activeTool, setActiveTool] = useState<AcrobatToolMode>('pan');

  // Text Tool options
  const [selectedTextColor, setSelectedTextColor] = useState<string>('#0F172A');
  const [selectedTextSize, setSelectedTextSize] = useState<number>(15);

  // Highlighter options
  const [selectedHighlightColor, setSelectedHighlightColor] = useState<string>('#FFEB3B');

  // Watermark options
  const [isWatermarkEnabled, setIsWatermarkEnabled] = useState<boolean>(false);
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENCIAL');
  const [watermarkFontSize, setWatermarkFontSize] = useState<number>(54);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.25);
  const [watermarkRotation, setWatermarkRotation] = useState<number>(45);
  const [watermarkColor, setWatermarkColor] = useState<string>('#DC2626');

  // Signature Modal state
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState<boolean>(false);
  const [hasSignature, setHasSignature] = useState<boolean>(false);
  const [tempSignatureDataUrl, setTempSignatureDataUrl] = useState<string | null>(null);

  // Modifications store
  const [textItems, setTextItems] = useState<LiveTextItem[]>([]);
  const [highlightItems, setHighlightItems] = useState<LiveHighlightItem[]>([]);
  const [redactionItems, setRedactionItems] = useState<LiveRedactionItem[]>([]);
  const [signatureItems, setSignatureItems] = useState<LiveSignatureItem[]>([]);

  // Mouse interaction state for dragging / drawing boxes
  const [isMouseDragging, setIsMouseDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);

  // Dragging existing items
  const [movingItemId, setMovingItemId] = useState<string | null>(null);
  const [moveOffset, setMoveOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const sigPadRef = useRef<HTMLCanvasElement | null>(null);
  const isSigDrawing = useRef<boolean>(false);

  // Document count & reset on new file
  useEffect(() => {
    if (file) {
      setCurrentPage(1);
      setRotation(0);
      setTextItems([]);
      setHighlightItems([]);
      setRedactionItems([]);
      setSignatureItems([]);
      setIsWatermarkEnabled(false);
      PDFService.getPageCount(file.data)
        .then((count) => setTotalPages(count))
        .catch(console.error);
    }
  }, [file]);

  // Render page to canvas
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
      .then(async () => {
        try {
          const texts = await PDFService.extractPageTextItems(file.data, currentPage, scale);
          if (!isCancelled) setDetectedTexts(texts);
        } catch {}
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

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveAll();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndoLast();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [textItems, highlightItems, redactionItems, signatureItems, isWatermarkEnabled, watermarkText, file]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.15, 2.5));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.15, 0.5));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);

  // Interactive Overlay Click / Drag handlers
  const handleOverlayMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!overlayRef.current || activeTool === 'pan') return;

    // GUARD: Never create a new text item if clicking inside an existing item, button or input
    const target = e.target as HTMLElement;
    if (
      target.closest('.text-item-box') ||
      target.closest('.signature-item-box') ||
      target.closest('button') ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA'
    ) {
      return;
    }

    const rect = overlayRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'text') {
      // Add a text box directly where clicked
      const newItem: LiveTextItem = {
        id: Math.random().toString(),
        pageNumber: currentPage,
        text: 'Clique para digitar',
        screenX: x,
        screenY: y,
        size: selectedTextSize,
        colorHex: selectedTextColor,
      };
      setTextItems((prev) => [...prev, newItem]);
      return;
    }

    if (activeTool === 'highlight' || activeTool === 'redact') {
      setIsMouseDragging(true);
      setDragStart({ x, y });
      setDragCurrent({ x, y });
    }
  };

  const handleOverlayMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!overlayRef.current) return;
    const rect = overlayRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

    if (isMouseDragging) {
      setDragCurrent({ x, y });
    } else if (movingItemId) {
      // Repositioning text or signature item
      setTextItems((prev) =>
        prev.map((t) => (t.id === movingItemId ? { ...t, screenX: x - moveOffset.x, screenY: y - moveOffset.y } : t))
      );
      setSignatureItems((prev) =>
        prev.map((s) => (s.id === movingItemId ? { ...s, screenX: x - moveOffset.x, screenY: y - moveOffset.y } : s))
      );
    }
  };

  const handleOverlayMouseUp = () => {
    if (movingItemId) {
      setMovingItemId(null);
    }

    if (!isMouseDragging || !dragStart || !dragCurrent) {
      setIsMouseDragging(false);
      setDragStart(null);
      setDragCurrent(null);
      return;
    }

    const w = Math.abs(dragCurrent.x - dragStart.x);
    const h = Math.abs(dragCurrent.y - dragStart.y);
    const left = Math.min(dragStart.x, dragCurrent.x);
    const top = Math.min(dragStart.y, dragCurrent.y);

    if (w > 6 && h > 6) {
      if (activeTool === 'highlight') {
        const newHighlight: LiveHighlightItem = {
          id: Math.random().toString(),
          pageNumber: currentPage,
          screenX: left,
          screenY: top,
          screenWidth: w,
          screenHeight: h,
          colorHex: selectedHighlightColor,
          opacity: 0.4,
        };
        setHighlightItems((prev) => [...prev, newHighlight]);
      } else if (activeTool === 'redact') {
        const newRedaction: LiveRedactionItem = {
          id: Math.random().toString(),
          pageNumber: currentPage,
          screenX: left,
          screenY: top,
          screenWidth: w,
          screenHeight: h,
        };
        setRedactionItems((prev) => [...prev, newRedaction]);
      }
    }

    setIsMouseDragging(false);
    setDragStart(null);
    setDragCurrent(null);
  };


  // Smart Snap-to-Text Click Handlers
  const handleSmartTextClick = (item: DetectedTextItem) => {
    if (activeTool === 'highlight') {
      const newHighlight: LiveHighlightItem = {
        id: Math.random().toString(),
        pageNumber: currentPage,
        screenX: item.screenLeft,
        screenY: item.screenTop,
        screenWidth: item.screenWidth,
        screenHeight: item.screenHeight,
        colorHex: selectedHighlightColor,
        opacity: 0.42,
      };
      setHighlightItems((prev) => [...prev, newHighlight]);
      onShowMessage?.(`Texto "${item.str}" grifado!`, 'success');
    } else if (activeTool === 'redact') {
      const newRedaction: LiveRedactionItem = {
        id: Math.random().toString(),
        pageNumber: currentPage,
        screenX: item.screenLeft,
        screenY: item.screenTop,
        screenWidth: item.screenWidth,
        screenHeight: item.screenHeight,
      };
      setRedactionItems((prev) => [...prev, newRedaction]);
      onShowMessage?.(`Texto "${item.str}" censurado!`, 'success');
    }
  };

  // Undo Last Modification
  const handleUndoLast = () => {
    if (textItems.length > 0) {
      setTextItems((prev) => prev.slice(0, -1));
    } else if (highlightItems.length > 0) {
      setHighlightItems((prev) => prev.slice(0, -1));
    } else if (redactionItems.length > 0) {
      setRedactionItems((prev) => prev.slice(0, -1));
    } else if (signatureItems.length > 0) {
      setSignatureItems((prev) => prev.slice(0, -1));
    } else if (isWatermarkEnabled) {
      setIsWatermarkEnabled(false);
    }
  };

  // Signature Pad Handlers
  const handleSigMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = sigPadRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    isSigDrawing.current = true;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
  };

  const handleSigMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSigDrawing.current) return;
    const canvas = sigPadRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const handleSigMouseUp = () => {
    if (isSigDrawing.current && sigPadRef.current) {
      isSigDrawing.current = false;
      setTempSignatureDataUrl(sigPadRef.current.toDataURL('image/png'));
    }
  };

  const handleClearSigPad = () => {
    const canvas = sigPadRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setTempSignatureDataUrl(null);
  };

  const handleConfirmSignature = () => {
    if (!tempSignatureDataUrl) return;
    const newSig: LiveSignatureItem = {
      id: Math.random().toString(),
      pageNumber: currentPage,
      dataUrl: tempSignatureDataUrl,
      screenX: 120,
      screenY: 200,
      screenWidth: 160,
      screenHeight: 65,
    };
    setSignatureItems((prev) => [...prev, newSig]);
    setIsSignatureModalOpen(false);
    setActiveTool('pan');
    onShowMessage?.('Assinatura inserida! Você pode arrastá-la para o campo desejado.', 'success');
  };

  // Total modifications count
  const totalModifications = 
    textItems.length + 
    highlightItems.length + 
    redactionItems.length + 
    signatureItems.length + 
    (isWatermarkEnabled ? 1 : 0);

  // SAVE ALL (Acrobat Live Commit)
  const handleSaveAll = async () => {
    if (!file) return;
    if (totalModifications === 0) {
      onShowMessage?.('Nenhuma edição pendente para salvar.', 'error');
      return;
    }

    try {
      setSaving(true);
      const canvasH = canvasRef.current ? canvasRef.current.height : 800;

      // Coordinate transformation: Screen -> PDF Points
      const pdfTexts = textItems.map((t) => ({
        pageNumber: t.pageNumber,
        text: t.text,
        x: t.screenX / scale,
        y: (canvasH - t.screenY) / scale - (t.size * 0.8),
        size: t.size,
        colorHex: t.colorHex,
      }));

      const pdfHighlights = highlightItems.map((h) => ({
        pageNumber: h.pageNumber,
        x: h.screenX / scale,
        y: (canvasH - (h.screenY + h.screenHeight)) / scale,
        width: h.screenWidth / scale,
        height: h.screenHeight / scale,
        colorHex: h.colorHex,
        opacity: h.opacity,
      }));

      const pdfRedactions = redactionItems.map((r) => ({
        pageNumber: r.pageNumber,
        x: r.screenX / scale,
        y: (canvasH - (r.screenY + r.screenHeight)) / scale,
        width: r.screenWidth / scale,
        height: r.screenHeight / scale,
      }));

      const pdfSignatures = signatureItems.map((s) => ({
        pageNumber: s.pageNumber,
        dataUrl: s.dataUrl,
        x: s.screenX / scale,
        y: (canvasH - (s.screenY + s.screenHeight)) / scale,
        width: s.screenWidth / scale,
        height: s.screenHeight / scale,
      }));

      const modifiedBytes = await PDFService.applyLiveModifications(file.data, {
        texts: pdfTexts,
        highlights: pdfHighlights,
        redactions: pdfRedactions,
        signatures: pdfSignatures,
        watermark: isWatermarkEnabled
          ? {
              enabled: true,
              text: watermarkText,
              fontSize: watermarkFontSize,
              opacity: watermarkOpacity,
              colorHex: watermarkColor,
              rotationDeg: watermarkRotation,
            }
          : undefined,
      });

      if (window.electronAPI) {
        const defaultName = file.name.replace(/\.pdf$/i, '') + '_editado.pdf';
        const savePath = await window.electronAPI.saveFileDialog({
          defaultPath: defaultName,
        });

        if (savePath) {
          await window.electronAPI.writeFile(savePath, modifiedBytes.buffer as ArrayBuffer);
          onShowMessage?.(`Documento salvo com sucesso em: ${savePath}`, 'success');
        }
      } else {
        const blob = PDFService.createBlob(modifiedBytes);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Editado_${file.name}`;
        a.click();
        URL.revokeObjectURL(url);
        onShowMessage?.('PDF atualizado baixado com sucesso!', 'success');
      }

      // Update current file in app
      if (onFileUpdated) {
        onFileUpdated({
          ...file,
          data: modifiedBytes.buffer as ArrayBuffer,
        });
      }

      // Clear pending overlays since they are now permanently written into the PDF
      setTextItems([]);
      setHighlightItems([]);
      setRedactionItems([]);
      setSignatureItems([]);
      setIsWatermarkEnabled(false);
    } catch (err: any) {
      onShowMessage?.(`Erro ao salvar edições: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950/60 select-none">
        <div className="w-20 h-20 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-5 shadow-2xl">
          <FolderOpen className="w-10 h-10 text-brand-400 animate-pulse" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Nenhum Documento Aberto</h2>
        <p className="text-slate-400 text-sm max-w-md mb-6 leading-relaxed">
          Abra qualquer arquivo PDF para visualizar e editar ao vivo com ferramentas estilo Adobe Acrobat Pro (Texto, Marca-texto, Tarja, Assinatura e Marca d'água).
        </p>
        <button
          onClick={onOpenFile}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-rose-600 hover:from-brand-500 hover:to-rose-500 text-white font-semibold text-sm shadow-xl shadow-brand-600/30 transition-all hover:scale-105 active:scale-95"
        >
          Selecionar Arquivo PDF
        </button>
      </div>
    );
  }

  // Active drag box during mouse move
  const dragBox = isMouseDragging && dragStart && dragCurrent ? {
    left: Math.min(dragStart.x, dragCurrent.x),
    top: Math.min(dragStart.y, dragCurrent.y),
    width: Math.abs(dragCurrent.x - dragStart.x),
    height: Math.abs(dragCurrent.y - dragStart.y),
  } : null;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-950 select-none">
      {/* ============================================================== */}
      {/* 🚀 ADOBE ACROBAT PRO UNIFIED LIVE TOOLBAR                      */}
      {/* ============================================================== */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 px-3 flex items-center justify-between shrink-0 shadow-md z-30">
        {/* Left: Acrobat Tool Selection Buttons */}
        <div className="flex items-center space-x-1 overflow-x-auto">
          {/* 1. Pan / Pointer */}
          <button
            onClick={() => setActiveTool('pan')}
            title="Navegar & Selecionar (Padrão)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              activeTool === 'pan'
                ? 'bg-brand-500/20 text-brand-300 border-brand-500 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700/80 hover:text-white'
            }`}
          >
            <Hand className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Navegar</span>
          </button>

          {/* 2. Free Text Tool */}
          <button
            onClick={() => setActiveTool('text')}
            title="Inserir Texto Livre no PDF"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              activeTool === 'text'
                ? 'bg-brand-500/20 text-brand-300 border-brand-500 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700/80 hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            <span>Texto</span>
          </button>

          {/* 3. Highlighter Tool */}
          <button
            onClick={() => setActiveTool('highlight')}
            title="Marca-Texto / Grifar Trechos"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              activeTool === 'highlight'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700/80 hover:text-white'
            }`}
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span>Grifar</span>
          </button>

          {/* 4. Redaction (Censorship) */}
          <button
            onClick={() => setActiveTool('redact')}
            title="Tarja de Censura Permanente (LGPD)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              activeTool === 'redact'
                ? 'bg-neutral-600/30 text-neutral-200 border-neutral-500 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700/80 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Censurar</span>
          </button>

          {/* 5. Signature Tool */}
          <button
            onClick={() => {
              setActiveTool('signature');
              setIsSignatureModalOpen(true);
            }}
            title="Inserir Assinatura ou Rubrica"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              activeTool === 'signature'
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700/80 hover:text-white'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Assinar</span>
          </button>

          {/* 6. Live Watermark Tool */}
          <button
            onClick={() => setIsWatermarkEnabled(!isWatermarkEnabled)}
            title="Ativar/Desativar Marca d'Água ao Vivo"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isWatermarkEnabled
                ? 'bg-rose-500/25 text-rose-300 border-rose-500 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700/80 hover:text-white'
            }`}
          >
            <Droplet className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Marca d'Água</span>
          </button>

          {/* Undo Button */}
          {totalModifications > 0 && (
            <button
              onClick={handleUndoLast}
              title="Desfazer última modificação (Ctrl+Z)"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 ml-1"
            >
              <CornerUpLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Center: Contextual Tool Options Banner */}
        <div className="hidden xl:flex items-center space-x-2 bg-slate-950/70 border border-slate-800 px-3 py-1 rounded-xl text-xs">
          {activeTool === 'text' && (
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-400">Tamanho:</span>
              <select
                value={selectedTextSize}
                onChange={(e) => setSelectedTextSize(parseInt(e.target.value, 10))}
                className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white"
              >
                <option value={12}>12 pt</option>
                <option value={15}>15 pt</option>
                <option value={18}>18 pt</option>
                <option value={24}>24 pt</option>
                <option value={32}>32 pt</option>
              </select>
              <span className="text-[11px] text-slate-400 ml-2">Cor:</span>
              <div className="flex space-x-1">
                {['#0F172A', '#2563EB', '#DC2626', '#16A34A', '#FFFFFF'].map((hex) => (
                  <button
                    key={hex}
                    onClick={() => setSelectedTextColor(hex)}
                    style={{ backgroundColor: hex }}
                    className={`w-4 h-4 rounded-full border ${selectedTextColor === hex ? 'ring-2 ring-brand-400 scale-110' : 'border-slate-700'}`}
                  />
                ))}
              </div>
              <span className="text-[10px] text-brand-300 ml-2 font-mono">Clique no documento para escrever</span>
            </div>
          )}

          {activeTool === 'highlight' && (
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-400">Cor do Marcador:</span>
              <div className="flex space-x-1.5">
                {[
                  { hex: '#FFEB3B', label: 'Amarelo' },
                  { hex: '#4CAF50', label: 'Verde' },
                  { hex: '#00BCD4', label: 'Azul' },
                  { hex: '#E91E63', label: 'Rosa' },
                ].map((c) => (
                  <button
                    key={c.hex}
                    onClick={() => setSelectedHighlightColor(c.hex)}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                    className={`w-4 h-4 rounded-full border ${selectedHighlightColor === c.hex ? 'ring-2 ring-white scale-110' : 'border-transparent'}`}
                  />
                ))}
              </div>
              <span className="text-[10px] text-amber-300 ml-2 font-medium">Modo Híbrido: Clique na palavra para detectar ou arraste livremente</span>
            </div>
          )}

          {activeTool === 'redact' && (
            <span className="text-[11px] text-rose-300 font-medium">
              Modo Censura Híbrido: Clique na palavra para censurar ou arraste para cobrir área livre.
            </span>
          )}

          {isWatermarkEnabled && (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={watermarkText}
                onChange={(e) => setWatermarkText(e.target.value)}
                placeholder="Texto da marca"
                className="bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-xs text-white w-28 font-bold"
              />
              <select
                value={watermarkRotation}
                onChange={(e) => setWatermarkRotation(parseInt(e.target.value, 10))}
                className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white"
              >
                <option value={45}>45° Subindo</option>
                <option value={-45}>-45° Descendo</option>
                <option value={0}>0° Horizontal</option>
                <option value={90}>90° Vertical</option>
              </select>
            </div>
          )}

          {activeTool === 'pan' && !isWatermarkEnabled && (
            <span className="text-[11px] text-slate-400">
              Modo Visualizador Acrobat • Escolha uma ferramenta acima para editar diretamente na página
            </span>
          )}
        </div>

        {/* Right: Viewport Controls & Save Button */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* Zoom Out / In */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleZoomOut}
              title="Reduzir Zoom (-)"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono text-slate-300 min-w-[42px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              title="Aumentar Zoom (+)"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={handleRotate}
            title="Rotacionar 90°"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? 'Desativar Modo Noturno' : 'Ativar Modo Noturno'}
            className={`p-1.5 rounded-lg border transition-all ${
              isDarkMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            {isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* PRO SAVE BUTTON */}
          <button
            onClick={handleSaveAll}
            disabled={saving || totalModifications === 0}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-lg transition-all active:scale-95 ${
              totalModifications > 0
                ? 'bg-gradient-to-r from-brand-600 to-rose-600 hover:from-brand-500 hover:to-rose-500 text-white shadow-brand-500/25 ring-2 ring-brand-400/40'
                : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60'
            }`}
          >
            {saving ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Gravando...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Tudo {totalModifications > 0 && `(${totalModifications})`}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 📖 MAIN WORKSPACE: THUMBNAILS + REAL LIVE PDF CANVAS           */}
      {/* ============================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Thumbnails Sidebar */}
        {showThumbnails && (
          <aside className="w-44 bg-slate-900/70 border-r border-slate-800/80 overflow-y-auto p-3 space-y-2.5 shrink-0 select-none">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
              <span>Páginas ({totalPages})</span>
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
                  <div className="w-full aspect-[3/4] bg-slate-800 rounded flex items-center justify-center font-mono text-xs border border-slate-700/50 mb-1">
                    {pageNum}
                  </div>
                  <span className="text-[10px] font-medium">Página {pageNum}</span>
                </button>
              );
            })}
          </aside>
        )}

        {/* Viewport Area with Full Height Scrolling */}
        <div className="flex-1 overflow-auto flex flex-col items-center justify-start p-6 bg-slate-950/95 relative">
          {/* Navigation Controls Floating Pill */}
          <div className="mb-4 flex items-center space-x-3 bg-slate-900 border border-slate-800 px-4 py-1.5 rounded-xl shadow-lg shrink-0">
            <button
              onClick={() => setShowThumbnails(!showThumbnails)}
              title="Alternar Miniaturas"
              className="p-1 rounded text-slate-400 hover:text-white"
            >
              <Layers className="w-4 h-4" />
            </button>
            <div className="h-3.5 w-px bg-slate-800" />
            <button
              onClick={handlePrevPage}
              disabled={currentPage <= 1}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs text-white">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage >= totalPages}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {totalModifications > 0 && (
              <span className="text-[11px] font-semibold text-brand-400 border-l border-slate-800 pl-3">
                {totalModifications} alteração(ões) pendentes (Ctrl+S para gravar)
              </span>
            )}
          </div>

          {/* Real PDF Canvas Document Container */}
          <div 
            style={
              isDarkMode
                ? { filter: 'invert(0.92) hue-rotate(180deg) brightness(1.05) contrast(0.95)' }
                : {}
            }
            className="relative shadow-2xl rounded border border-slate-700/80 bg-white overflow-hidden shrink-0"
          >
            {loading && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-30">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs shadow-2xl">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                  Carregando página {currentPage}...
                </div>
              </div>
            )}

            {/* The PDF Canvas */}
            <canvas ref={canvasRef} className="block" />

            {/* Live Watermark Overlay across the center of the page */}
            {isWatermarkEnabled && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden z-10">
                <span
                  className="font-extrabold select-none tracking-widest text-center whitespace-nowrap"
                  style={{
                    fontSize: `${watermarkFontSize * scale * 0.9}px`,
                    opacity: watermarkOpacity,
                    color: watermarkColor,
                    transform: `rotate(${-watermarkRotation}deg)`,
                  }}
                >
                  {watermarkText || 'CONFIDENCIAL'}
                </span>
              </div>
            )}

            {/* Interactive Acrobat Overlay Layer */}
            <div
              ref={overlayRef}
              onMouseDown={handleOverlayMouseDown}
              onMouseMove={handleOverlayMouseMove}
              onMouseUp={handleOverlayMouseUp}
              className={`absolute inset-0 z-20 ${
                activeTool === 'text'
                  ? 'cursor-text'
                  : activeTool === 'highlight' || activeTool === 'redact'
                  ? 'cursor-crosshair'
                  : activeTool === 'signature'
                  ? 'cursor-pointer'
                  : 'cursor-default'
              }`}
            >
                            {/* Smart Detected Texts (Hover & Click to Highlight or Redact) */}
              {(activeTool === 'highlight' || activeTool === 'redact') &&
                detectedTexts.map((item) => (
                  <div
                    key={item.id}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSmartTextClick(item);
                    }}
                    title={activeTool === 'highlight' ? `Clique para grifar: "${item.str}"` : `Clique para censurar: "${item.str}"`}
                    style={{
                      left: `${item.screenLeft}px`,
                      top: `${item.screenTop}px`,
                      width: `${item.screenWidth}px`,
                      height: `${item.screenHeight}px`,
                    }}
                    className={`absolute cursor-pointer transition-all z-10 ${
                      activeTool === 'highlight'
                        ? 'hover:bg-amber-300/35 hover:ring-1 hover:ring-amber-500'
                        : 'hover:bg-neutral-900/60 hover:ring-1 hover:ring-neutral-900'
                    }`}
                  />
                ))}

              {/* Highlights on this page */}
              {highlightItems
                .filter((h) => h.pageNumber === currentPage)
                .map((h) => (
                  <div
                    key={h.id}
                    style={{
                      left: `${h.screenX}px`,
                      top: `${h.screenY}px`,
                      width: `${h.screenWidth}px`,
                      height: `${h.screenHeight}px`,
                      backgroundColor: h.colorHex,
                      opacity: h.opacity,
                    }}
                    className="absolute border border-amber-400/40 group cursor-pointer"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setHighlightItems((prev) => prev.filter((item) => item.id !== h.id));
                      }}
                      title="Excluir destaque"
                      className="hidden group-hover:flex absolute -top-3 -right-3 w-5 h-5 bg-rose-600 text-white rounded-full items-center justify-center text-[10px] shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

              {/* Redactions (Solid Black Censorship) */}
              {redactionItems
                .filter((r) => r.pageNumber === currentPage)
                .map((r) => (
                  <div
                    key={r.id}
                    style={{
                      left: `${r.screenX}px`,
                      top: `${r.screenY}px`,
                      width: `${r.screenWidth}px`,
                      height: `${r.screenHeight}px`,
                    }}
                    className="absolute bg-black group cursor-pointer"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRedactionItems((prev) => prev.filter((item) => item.id !== r.id));
                      }}
                      title="Excluir censura"
                      className="hidden group-hover:flex absolute -top-3 -right-3 w-5 h-5 bg-rose-600 text-white rounded-full items-center justify-center text-[10px] shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

              {/* Live Freehand Texts */}
              {textItems
                .filter((t) => t.pageNumber === currentPage)
                .map((t) => (
                  <div
                    key={t.id}
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      left: `${t.screenX}px`,
                      top: `${t.screenY}px`,
                    }}
                    className="text-item-box absolute group z-30 flex items-center gap-1 bg-white border border-slate-400/90 rounded-lg px-2 py-0.5 shadow-md"
                  >
                    <input
                      type="text"
                      value={t.text}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTextItems((prev) => prev.map((item) => (item.id === t.id ? { ...item, text: val } : item)));
                      }}
                      style={{
                        fontSize: `${t.size}px`,
                        color: t.colorHex,
                      }}
                      className="bg-transparent focus:outline-none font-sans font-medium min-w-[60px]"
                    />
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setMovingItemId(t.id);
                        if (overlayRef.current) {
                          const rect = overlayRef.current.getBoundingClientRect();
                          setMoveOffset({ x: e.clientX - rect.left - t.screenX, y: e.clientY - rect.top - t.screenY });
                        }
                      }}
                      title="Arrastar texto"
                      className="cursor-move p-0.5 text-slate-400 hover:text-slate-700 rounded"
                    >
                      <Move className="w-3 h-3" />
                    </div>
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTextItems((prev) => prev.filter((item) => item.id !== t.id));
                      }}
                      title="Excluir texto"
                      className="p-0.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

              {/* Signatures */}
              {signatureItems
                .filter((s) => s.pageNumber === currentPage)
                .map((s) => (
                  <div
                    key={s.id}
                    style={{
                      left: `${s.screenX}px`,
                      top: `${s.screenY}px`,
                      width: `${s.screenWidth}px`,
                      height: `${s.screenHeight}px`,
                    }}
                    className="signature-item-box absolute border border-dashed border-indigo-500/80 rounded group cursor-move bg-white/40"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setMovingItemId(s.id);
                      if (overlayRef.current) {
                        const rect = overlayRef.current.getBoundingClientRect();
                        setMoveOffset({ x: e.clientX - rect.left - s.screenX, y: e.clientY - rect.top - s.screenY });
                      }
                    }}
                  >
                    <img
                      src={s.dataUrl}
                      alt="Assinatura"
                      className="w-full h-full object-contain pointer-events-none select-none"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSignatureItems((prev) => prev.filter((item) => item.id !== s.id));
                      }}
                      title="Excluir assinatura"
                      className="hidden group-hover:flex absolute -top-3 -right-3 w-5 h-5 bg-rose-600 text-white rounded-full items-center justify-center text-[10px] shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

              {/* Drag Box Preview */}
              {dragBox && (
                <div
                  style={{
                    left: `${dragBox.left}px`,
                    top: `${dragBox.top}px`,
                    width: `${dragBox.width}px`,
                    height: `${dragBox.height}px`,
                    backgroundColor: activeTool === 'highlight' ? selectedHighlightColor : '#000000',
                    opacity: activeTool === 'highlight' ? 0.45 : 0.85,
                  }}
                  className="absolute pointer-events-none border-2 border-dashed border-white shadow"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 🖋️ MODAL DESENHAR ASSINATURA RÁPIDA                           */}
      {/* ============================================================== */}
      {isSignatureModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PenTool className="w-4 h-4 text-brand-400" />
                Desenhe sua Assinatura / Rubrica
              </h3>
              <button
                onClick={() => setIsSignatureModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Desenhe sua assinatura com o mouse ou caneta touch abaixo para carimbar no documento:
            </p>

            <div className="bg-white rounded-xl border border-slate-700 overflow-hidden shadow-inner">
              <canvas
                ref={sigPadRef}
                width={380}
                height={160}
                onMouseDown={handleSigMouseDown}
                onMouseMove={handleSigMouseMove}
                onMouseUp={handleSigMouseUp}
                onMouseLeave={handleSigMouseUp}
                className="cursor-crosshair w-full block"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleClearSigPad}
                className="px-3 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-950/40 border border-rose-900/50"
              >
                Limpar
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsSignatureModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!hasSignature}
                  onClick={handleConfirmSignature}
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-500 disabled:opacity-40 shadow-lg shadow-brand-600/30"
                >
                  Carimbar no PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
