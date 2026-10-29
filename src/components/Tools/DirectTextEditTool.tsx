import React, { useState, useEffect, useRef } from 'react';
import { 
  Type,
  Camera,
  ScanText, 
  Search, 
  RotateCw, 
  Download, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Check, 
  X,
  Sparkles,
  ArrowRight,
  FolderOpen,
  Move,
  GripVertical,
  RotateCcw,
  AlignLeft,
  AlignCenter,
  Bold,
  Italic,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { PDFFileInfo, DetectedTextItem, TextEditItem } from '../../types';
import { PDFService } from '../../services/pdfService';

interface DirectTextEditToolProps {
  currentFile: PDFFileInfo | null;
  onOpenFile: () => void;
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
  onFileUpdated?: (newFile: PDFFileInfo) => void;
}

export const DirectTextEditTool: React.FC<DirectTextEditToolProps> = ({
  currentFile,
  onOpenFile,
  onShowMessage,
  onFileUpdated,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [detectedTexts, setDetectedTexts] = useState<DetectedTextItem[]>([]);
  const [edits, setEdits] = useState<TextEditItem[]>([]);
  const [selectedText, setSelectedText] = useState<DetectedTextItem | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  
  // Typography controls for selected text
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>('sans');
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<number>(12);
  const [textColor, setTextColor] = useState<{ r: number; g: number; b: number }>({ r: 0.05, g: 0.05, b: 0.05 });

  // Free movement & alignment coordinates
  const [movedLeft, setMovedLeft] = useState<number>(0);
  const [movedTop, setMovedTop] = useState<number>(0);
  const [movedPdfX, setMovedPdfX] = useState<number>(0);
  const [movedPdfY, setMovedPdfY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [isScannedDoc, setIsScannedDoc] = useState<boolean>(false);
  const [isOcrRunning, setIsOcrRunning] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [ocrStatus, setOcrStatus] = useState<string>('');
  const [ocrLevel, setOcrLevel] = useState<'words' | 'lines'>('words');
  const [ocrLang, setOcrLang] = useState<string>(() => localStorage.getItem('omnipdf_ocr_lang') || 'por');
  const [maskType, setMaskType] = useState<'auto' | 'white'>('auto');

  // Search & Replace states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [replaceTerm, setReplaceTerm] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; boxLeft: number; boxTop: number } | null>(null);
  const scale = 1.3; // Fixed optimal editing scale

  // Load page count when file changes
  useEffect(() => {
    if (currentFile) {
      setCurrentPage(1);
      setEdits([]);
      setSelectedText(null);
      PDFService.getPageCount(currentFile.data)
        .then((count) => setTotalPages(count))
        .catch(console.error);
    }
  }, [currentFile]);

  // Render canvas and extract text items for current page
  useEffect(() => {
    if (!currentFile || !canvasRef.current) return;

    let isCancelled = false;
    setLoading(true);

    const loadPage = async () => {
      try {
        if (!canvasRef.current) return;
        // 1. Render visual canvas
        await PDFService.renderPageToCanvas(
          currentFile.data,
          currentPage,
          canvasRef.current,
          scale
        );

        // 2. Extract text items with coordinate mapping (automatic OCR for scans/photos)
        const { items, isScanned } = await PDFService.extractPageTextWithOcrFallback(
          currentFile.data,
          currentPage,
          scale,
          {
            lang: ocrLang,
            level: ocrLevel,
            pageCanvas: canvasRef.current,
            onProgress: (p, s) => {
              if (!isCancelled) {
                setIsOcrRunning(true);
                setOcrProgress(p);
                setOcrStatus(s);
              }
            }
          }
        );

        if (!isCancelled) {
          setDetectedTexts(items);
          setIsScannedDoc(isScanned);
          setIsOcrRunning(false);
          setLoading(false);
          if (isScanned && items.length > 0) {
            onShowMessage(`Foto/digitalização reconhecida: ${items.length} blocos de texto prontos para edição!`, 'success');
          }
        }
      } catch (err: any) {
        console.error('Error loading page text:', err);
        if (!isCancelled) setLoading(false);
      }
    };

    loadPage();

    return () => {
      isCancelled = true;
    };
  }, [currentFile, currentPage]);

  // Handle free dragging with mouse
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current || !selectedText) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;

      const newScreenLeft = Math.round(dragStartRef.current.boxLeft + dx);
      const newScreenTop = Math.round(dragStartRef.current.boxTop + dy);

      // Delta in screen pixels
      const deltaFromOrigX = newScreenLeft - selectedText.screenLeft;
      const deltaFromOrigY = newScreenTop - selectedText.screenTop;

      // Convert to PDF coordinates
      const newPdfX = selectedText.pdfX + (deltaFromOrigX / scale);
      const newPdfY = selectedText.pdfY - (deltaFromOrigY / scale);

      setMovedLeft(newScreenLeft);
      setMovedTop(newScreenTop);
      setMovedPdfX(newPdfX);
      setMovedPdfY(newPdfY);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, selectedText, scale]);

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      boxLeft: movedLeft,
      boxTop: movedTop,
    };
  };

  // Nudge movement with buttons or keyboard
  const handleNudge = (dx: number, dy: number) => {
    if (!selectedText) return;
    setMovedLeft((prev) => {
      const nextLeft = prev + dx;
      const deltaX = nextLeft - selectedText.screenLeft;
      setMovedPdfX(selectedText.pdfX + deltaX / scale);
      return nextLeft;
    });
    setMovedTop((prev) => {
      const nextTop = prev + dy;
      const deltaY = nextTop - selectedText.screenTop;
      setMovedPdfY(selectedText.pdfY - deltaY / scale);
      return nextTop;
    });
  };

  const handleResetPosition = () => {
    if (!selectedText) return;
    setMovedLeft(selectedText.screenLeft);
    setMovedTop(selectedText.screenTop);
    setMovedPdfX(selectedText.pdfX);
    setMovedPdfY(selectedText.pdfY);
  };

  const handleSelectTextItem = (item: DetectedTextItem) => {
    // Check if item already has an edit
    const existingEdit = edits.find(
      (e) => e.pageNumber === currentPage && Math.abs(e.origPdfX ? e.origPdfX - item.pdfX : e.pdfX - item.pdfX) < 2
    );

    setSelectedText(item);
    setEditingValue(existingEdit ? existingEdit.newText : item.str);
    
    // Automatically match font family, weight, style and size from PDF
    setFontFamily(existingEdit?.fontFamily || item.fontFamily || 'sans');
    setIsBold(existingEdit?.isBold !== undefined ? existingEdit.isBold : item.isBold || false);
    setIsItalic(existingEdit?.isItalic !== undefined ? existingEdit.isItalic : item.isItalic || false);
    setFontSize(existingEdit?.fontSize || item.fontSize || 12);
    setTextColor(existingEdit?.textColor || { r: 0.05, g: 0.05, b: 0.05 });

    // Initial position: existing moved position or original location
    const curLeft = existingEdit?.screenLeft !== undefined ? existingEdit.screenLeft : item.screenLeft;
    const curTop = existingEdit?.screenTop !== undefined ? existingEdit.screenTop : item.screenTop;
    const curPdfX = existingEdit?.pdfX !== undefined ? existingEdit.pdfX : item.pdfX;
    const curPdfY = existingEdit?.pdfY !== undefined ? existingEdit.pdfY : item.pdfY;

    setMovedLeft(curLeft);
    setMovedTop(curTop);
    setMovedPdfX(curPdfX);
    setMovedPdfY(curPdfY);
  };

  const handleRunManualOcr = async (forcedLevel?: 'words' | 'lines', forcedLang?: string) => {
    if (!currentFile || !canvasRef.current) return;
    const targetLevel = forcedLevel || ocrLevel;
    const targetLang = forcedLang || ocrLang;

    setLoading(true);
    setIsOcrRunning(true);
    setOcrProgress(10);
    setOcrStatus('Executando OCR sob demanda...');

    try {
      const { items } = await PDFService.extractPageTextWithOcrFallback(
        currentFile.data,
        currentPage,
        scale,
        {
          forceOcr: true,
          lang: targetLang,
          level: targetLevel,
          pageCanvas: canvasRef.current,
          onProgress: (p, s) => {
            setOcrProgress(p);
            setOcrStatus(s);
          }
        }
      );
      setDetectedTexts(items);
      setIsScannedDoc(true);
      onShowMessage(`OCR concluído: ${items.length} blocos de texto prontos para edição!`, 'success');
    } catch (err: any) {
      onShowMessage(`Falha no OCR: ${err.message}`, 'error');
    } finally {
      setLoading(false);
      setIsOcrRunning(false);
    }
  };

  const handleSwitchLevel = (newLevel: 'words' | 'lines') => {
    setOcrLevel(newLevel);
    if (isScannedDoc) {
      handleRunManualOcr(newLevel);
    }
  };

  const handleApplySingleEdit = () => {
    if (!selectedText) return;

    const isMoved = Math.abs(movedLeft - selectedText.screenLeft) > 1 || Math.abs(movedTop - selectedText.screenTop) > 1;

    const newEdit: TextEditItem = {
      id: `edit-${currentPage}-${selectedText.pdfX.toFixed(1)}-${selectedText.pdfY.toFixed(1)}`,
      pageNumber: currentPage,
      // Original position where white/sampled mask will erase the old letters:
      origPdfX: selectedText.pdfX,
      origPdfY: selectedText.pdfY,
      origPdfWidth: selectedText.pdfWidth,
      origPdfHeight: selectedText.pdfHeight,
      // New moved & aligned position where the new letters will be written:
      pdfX: isMoved ? movedPdfX : selectedText.pdfX,
      pdfY: isMoved ? movedPdfY : selectedText.pdfY,
      pdfWidth: selectedText.pdfWidth,
      pdfHeight: selectedText.pdfHeight,
      screenLeft: movedLeft,
      screenTop: movedTop,
      originalText: selectedText.str,
      newText: editingValue,
      fontSize: Math.max(6, fontSize),
      fontFamily,
      isBold,
      isItalic,
      textColor,
      bgColor: maskType === 'auto' && selectedText.sampledBgColor ? selectedText.sampledBgColor : { r: 1, g: 1, b: 1 },
    };

    setEdits((prev) => {
      const filtered = prev.filter((e) => e.id !== newEdit.id);
      return [...filtered, newEdit];
    });

    onShowMessage(
      isMoved 
        ? `Texto editado e reposicionado na página ${currentPage}!`
        : `Texto alterado na página ${currentPage}!`, 
      'success'
    );
    setSelectedText(null);
  };

  const handleRemoveEdit = (id: string) => {
    setEdits((prev) => prev.filter((e) => e.id !== id));
  };

  const handleBatchFindReplace = () => {
    if (!searchTerm.trim()) {
      onShowMessage('Digite o texto que deseja localizar.', 'error');
      return;
    }

    const matches = detectedTexts.filter((t) =>
      t.str.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (matches.length === 0) {
      onShowMessage(`Nenhuma ocorrência de "${searchTerm}" encontrada nesta página.`, 'error');
      return;
    }

    const newEdits: TextEditItem[] = matches.map((item) => {
      const replaced = item.str.replace(new RegExp(searchTerm, 'gi'), replaceTerm);
      return {
        id: `edit-${currentPage}-${item.pdfX.toFixed(1)}-${item.pdfY.toFixed(1)}`,
        pageNumber: currentPage,
        origPdfX: item.pdfX,
        origPdfY: item.pdfY,
        origPdfWidth: item.pdfWidth,
        origPdfHeight: item.pdfHeight,
        pdfX: item.pdfX,
        pdfY: item.pdfY,
        pdfWidth: item.pdfWidth,
        pdfHeight: item.pdfHeight,
        screenLeft: item.screenLeft,
        screenTop: item.screenTop,
        originalText: item.str,
        newText: replaced,
        fontSize: item.fontSize,
        fontFamily: item.fontFamily || 'sans',
        isBold: item.isBold,
        isItalic: item.isItalic,
      };
    });

    setEdits((prev) => {
      const editIds = new Set(newEdits.map((e) => e.id));
      const filtered = prev.filter((e) => !editIds.has(e.id));
      return [...filtered, ...newEdits];
    });

    onShowMessage(`${matches.length} ocorrência(s) substituída(s) na página ${currentPage}!`, 'success');
    setSearchTerm('');
    setReplaceTerm('');
  };

  const handleSaveModifiedPdf = async () => {
    if (!currentFile || edits.length === 0) {
      onShowMessage('Faça pelo menos uma alteração de texto antes de salvar.', 'error');
      return;
    }

    try {
      setSaving(true);
      const modifiedBytes = await PDFService.applyTextEdits(currentFile.data, edits);

      if (window.electronAPI) {
        const savePath = await window.electronAPI.saveFileDialog({
          defaultPath: `Editado_${currentFile.name}`,
        });
        if (savePath) {
          await window.electronAPI.writeFile(savePath, modifiedBytes.buffer as ArrayBuffer);
          onShowMessage(`PDF salvo com alinhamento perfeito em: ${savePath}`, 'success');
        }
      } else {
        const blob = PDFService.createBlob(modifiedBytes);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Editado_${currentFile.name}`;
        a.click();
        URL.revokeObjectURL(url);
        onShowMessage('Download do PDF com alinhamento concluído!', 'success');
      }

      if (onFileUpdated) {
        onFileUpdated({
          ...currentFile,
          data: modifiedBytes.buffer as ArrayBuffer,
        });
      }
    } catch (err: any) {
      onShowMessage(`Erro ao salvar PDF editado: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Helper CSS font family
  const getCssFontFamily = (fam?: 'sans' | 'serif' | 'mono') => {
    if (fam === 'serif') return '"Times New Roman", Times, Georgia, serif';
    if (fam === 'mono') return '"Courier New", Courier, monospace';
    return 'Arial, Helvetica, sans-serif';
  };

  const rgbToHex = (c?: { r: number; g: number; b: number }) => {
    if (!c) return '#0f172a';
    const r = Math.round(c.r * 255).toString(16).padStart(2, '0');
    const g = Math.round(c.g * 255).toString(16).padStart(2, '0');
    const b = Math.round(c.b * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
  };

  if (!currentFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-center">
        <div className="w-20 h-20 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-5 shadow-2xl">
          <Type className="w-10 h-10 animate-pulse" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold mb-3 border border-brand-500/30">
          <Sparkles className="w-3.5 h-3.5" />
          TRUEEDIT COM MOVIMENTAÇÃO LIVRE
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Edição Direta de Texto e Alinhamento</h3>
        <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
          Selecione qualquer letra ou palavra original do PDF, edite mantendo a mesma tipografia e arraste livremente para alinhar milimetricamente na página.
        </p>
        <button
          onClick={onOpenFile}
          className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all hover:scale-105 active:scale-95"
        >
          Selecionar PDF ou Foto (PNG, JPG)
        </button>
      </div>
    );
  }

  const isCurrentSelectionMoved = selectedText 
    ? Math.abs(movedLeft - selectedText.screenLeft) > 1 || Math.abs(movedTop - selectedText.screenTop) > 1
    : false;

  const deltaX = selectedText ? Math.round(movedLeft - selectedText.screenLeft) : 0;
  const deltaY = selectedText ? Math.round(movedTop - selectedText.screenTop) : 0;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* OCR Progress Banner for Scanned Docs & Photos */}
      {isOcrRunning && (
        <div className="bg-amber-950/90 border-b border-amber-500/40 px-4 py-2 flex items-center justify-between text-xs text-amber-200 animate-pulse shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin shrink-0" />
            <span className="font-medium">{ocrStatus || 'Reconhecendo texto na digitalização ou foto de papel...'}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-28 h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 transition-all duration-200" style={{ width: `${ocrProgress}%` }} />
            </div>
            <span className="font-mono text-[11px] font-bold">{ocrProgress}%</span>
          </div>
        </div>
      )}

      {/* Top Toolbar: Navigation & Find/Replace */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 gap-4">
        {/* Page Nav */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono text-slate-300">
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 border border-slate-700"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-[11px] text-slate-400 font-mono ml-2">
            ({detectedTexts.length} blocos detectados)
          </span>
        </div>

        {/* Find & Replace Bar */}
        <div className="flex items-center space-x-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
          <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Localizar texto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-32"
          />
          <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Substituir por..."
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-32"
          />
          <button
            onClick={handleBatchFindReplace}
            disabled={!searchTerm.trim()}
            className="px-2.5 py-1 rounded bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-[11px] font-semibold transition-colors shrink-0"
          >
            Substituir
          </button>
        </div>

        {/* OCR & Scanned Paper Controls */}
        <div className="flex items-center gap-2">
          {isScannedDoc && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-xl text-[11px] font-semibold">
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Foto/Scan</span>
            </div>
          )}

          <div className="flex items-center bg-slate-950 px-1 py-1 rounded-xl border border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => handleSwitchLevel('words')}
              title="Editar palavra por palavra"
              className={`px-2 py-0.5 rounded-lg font-medium transition-colors ${
                ocrLevel === 'words' ? 'bg-brand-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Palavras
            </button>
            <button
              type="button"
              onClick={() => handleSwitchLevel('lines')}
              title="Editar linhas inteiras"
              className={`px-2 py-0.5 rounded-lg font-medium transition-colors ${
                ocrLevel === 'lines' ? 'bg-brand-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Linhas
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleRunManualOcr()}
            disabled={loading || isOcrRunning}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs transition-colors disabled:opacity-40"
            title="Reconhecer todo o texto da foto novamente"
          >
            <ScanText className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Reconhecer OCR</span>
          </button>
        </div>

        {/* Save Modified PDF Button */}
        <button
          onClick={handleSaveModifiedPdf}
          disabled={saving || edits.length === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95 shrink-0"
        >
          {saving ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Gravando...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Salvar PDF Editado ({edits.length})
            </>
          )}
        </button>
      </div>

      {/* Main Workspace (Canvas with Interactive Text Overlay + Side Ledger) */}
      <div className="flex-1 flex overflow-hidden">
        {/* PDF Canvas Viewport with Overlaid Interactive Elements */}
        <div className="flex-1 overflow-auto flex items-center justify-center p-8 bg-slate-950/90 relative">
          {loading && (
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-30">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs shadow-2xl">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                Mapeando tipografia e textos da página {currentPage}...
              </div>
            </div>
          )}

          {/* Interactive Document Wrapper */}
          <div className="relative shadow-2xl rounded border border-slate-700/80 bg-white overflow-hidden select-none">
            <canvas ref={canvasRef} className="block" />

            {/* Overlaid Interactive Text Boxes - Live In-Place Rendering */}
            <div className="absolute inset-0 pointer-events-auto">
              {detectedTexts.map((item) => {
                const edit = edits.find(
                  (e) => e.pageNumber === currentPage && Math.abs((e.origPdfX !== undefined ? e.origPdfX : e.pdfX) - item.pdfX) < 2
                );
                const isSelected = selectedText?.id === item.id;

                // When currently editing and moving this specific item:
                if (isSelected) {
                  return (
                    <React.Fragment key={item.id}>
                      {/* 1. Original Position Indicator (dashed box where the mask will erase old letters) */}
                      {isCurrentSelectionMoved && (
                        <div
                          style={{
                            left: `${item.screenLeft - 2}px`,
                            top: `${item.screenTop - 2}px`,
                            width: `${item.screenWidth + 4}px`,
                            height: `${item.screenHeight + 4}px`,
                          }}
                          className="absolute z-30 border-2 border-dashed border-rose-500/80 bg-rose-500/10 rounded pointer-events-none flex items-center justify-center"
                        >
                          <span className="text-[9px] font-mono font-bold bg-rose-600 text-white px-1 rounded shadow -top-3 absolute whitespace-nowrap">
                            Apagando do local original
                          </span>
                        </div>
                      )}

                      {/* 2. Floating Alignment & Typography Control Bar (positioned above the dragged box) */}
                      <div
                        style={{
                          left: `${movedLeft}px`,
                          top: `${movedTop - 46}px`,
                        }}
                        className="absolute z-50 flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl backdrop-blur-md"
                      >
                        {/* Drag Handle to Move Freely */}
                        <div
                          onMouseDown={handleDragStart}
                          title="Clique e arraste para mover livremente no documento"
                          className="flex items-center gap-1 px-2 py-1 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold cursor-move shadow-sm select-none"
                        >
                          <Move className="w-3.5 h-3.5" />
                          <span>Mover</span>
                        </div>

                        {/* Font Family Selector matching the PDF */}
                        <select
                          value={fontFamily}
                          onChange={(e) => setFontFamily(e.target.value as any)}
                          title="Tipografia idêntica ao PDF"
                          className="bg-slate-800 border border-slate-700 text-slate-200 text-[11px] rounded-lg px-2 py-1 font-medium focus:outline-none"
                        >
                          <option value="sans">Sans (Arial / Helvetica)</option>
                          <option value="serif">Serif (Times New Roman)</option>
                          <option value="mono">Mono (Courier / Código)</option>
                        </select>

                        {/* Bold Toggle */}
                        <button
                          type="button"
                          onClick={() => setIsBold((v) => !v)}
                          title="Alternar Negrito (Bold)"
                          className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center transition-colors ${
                            isBold ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>

                        {/* Italic Toggle */}
                        <button
                          type="button"
                          onClick={() => setIsItalic((v) => !v)}
                          title="Alternar Itálico"
                          className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center transition-colors ${
                            isItalic ? 'bg-brand-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>

                        {/* Font Size Stepper */}
                        <div className="flex items-center gap-1 bg-slate-800 px-1 py-0.5 rounded-lg border border-slate-700">
                          <button
                            type="button"
                            onClick={() => setFontSize((s) => Math.max(6, s - 1))}
                            className="w-5 h-5 rounded hover:bg-slate-700 text-slate-300 font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="font-mono text-[11px] text-slate-200 w-6 text-center font-bold">
                            {fontSize}
                          </span>
                          <button
                            type="button"
                            onClick={() => setFontSize((s) => s + 1)}
                            className="w-5 h-5 rounded hover:bg-slate-700 text-slate-300 font-bold text-xs"
                          >
                            +
                          </button>
                        </div>

                        {/* Micro-alignment D-Pad */}
                        <div className="flex items-center gap-0.5 bg-slate-800 px-1 py-0.5 rounded-lg border border-slate-700" title="Ajuste fino de alinhamento por pixel">
                          <button
                            type="button"
                            onClick={() => handleNudge(-1, 0)}
                            className="w-5 h-5 rounded hover:bg-slate-700 text-slate-300 font-bold text-[10px]"
                            title="Mover 1px à esquerda"
                          >
                            ←
                          </button>
                          <button
                            type="button"
                            onClick={() => handleNudge(1, 0)}
                            className="w-5 h-5 rounded hover:bg-slate-700 text-slate-300 font-bold text-[10px]"
                            title="Mover 1px à direita"
                          >
                            →
                          </button>
                          <button
                            type="button"
                            onClick={() => handleNudge(0, -1)}
                            className="w-5 h-5 rounded hover:bg-slate-700 text-slate-300 font-bold text-[10px]"
                            title="Mover 1px acima"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => handleNudge(0, 1)}
                            className="w-5 h-5 rounded hover:bg-slate-700 text-slate-300 font-bold text-[10px]"
                            title="Mover 1px abaixo"
                          >
                            ↓
                          </button>
                        </div>

                        {/* Snap Back to Original */}
                        {isCurrentSelectionMoved && (
                          <button
                            type="button"
                            onClick={handleResetPosition}
                            title="Voltar à posição original"
                            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* 3. The Interactive Moved Editing Box */}
                      <div
                        style={{
                          left: `${movedLeft - 2}px`,
                          top: `${movedTop - 2}px`,
                        }}
                        className="absolute z-40 flex items-center gap-1.5"
                      >
                        <input
                          type="text"
                          autoFocus
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleApplySingleEdit();
                            if (e.key === 'Escape') setSelectedText(null);
                            if (e.altKey) {
                              if (e.key === 'ArrowLeft') { e.preventDefault(); handleNudge(e.shiftKey ? -5 : -1, 0); }
                              if (e.key === 'ArrowRight') { e.preventDefault(); handleNudge(e.shiftKey ? 5 : 1, 0); }
                              if (e.key === 'ArrowUp') { e.preventDefault(); handleNudge(0, e.shiftKey ? -5 : -1); }
                              if (e.key === 'ArrowDown') { e.preventDefault(); handleNudge(0, e.shiftKey ? 5 : 1); }
                            }
                          }}
                          style={{
                            fontFamily: getCssFontFamily(fontFamily),
                            fontWeight: isBold ? 'bold' : 'normal',
                            fontStyle: isItalic ? 'italic' : 'normal',
                            fontSize: `${fontSize * scale}px`,
                            color: rgbToHex(textColor),
                            minWidth: `${Math.max(item.screenWidth + 24, 90)}px`,
                            height: `${item.screenHeight + 8}px`,
                          }}
                          className="bg-white border-2 border-brand-500 rounded-lg px-2 shadow-2xl focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleApplySingleEdit}
                          title="Confirmar alteração (Enter)"
                          className="h-full px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedText(null)}
                          title="Cancelar (Esc)"
                          className="h-full px-2 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-xs shadow flex items-center"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>

                        {/* Real-time Position Delta Badge */}
                        {isCurrentSelectionMoved && (
                          <div className="absolute -bottom-6 left-0 flex items-center gap-1 px-2 py-0.5 rounded bg-slate-900/90 text-amber-300 border border-slate-700 text-[10px] font-mono shadow-lg whitespace-nowrap pointer-events-none">
                            <span>ΔX: {deltaX > 0 ? `+${deltaX}` : deltaX}px</span>
                            <span>ΔY: {deltaY > 0 ? `+${deltaY}` : deltaY}px</span>
                          </div>
                        )}
                      </div>
                    </React.Fragment>
                  );
                }

                // If already edited, render live replacement and cover the original location:
                if (edit) {
                  const origLeft = item.screenLeft;
                  const origTop = item.screenTop;
                  const movedL = edit.screenLeft !== undefined ? edit.screenLeft : origLeft;
                  const movedT = edit.screenTop !== undefined ? edit.screenTop : origTop;
                  const hasMoved = Math.abs(movedL - origLeft) > 1 || Math.abs(movedT - origTop) > 1;

                  const bgHex = edit.bgColor ? rgbToHex(edit.bgColor) : '#ffffff';
                  const fgHex = edit.textColor ? rgbToHex(edit.textColor) : '#0f172a';

                  return (
                    <React.Fragment key={item.id}>
                      {/* Mask over original position to erase old letters */}
                      <div
                        style={{
                          left: `${origLeft - 1}px`,
                          top: `${origTop - 1}px`,
                          width: `${item.screenWidth + 2}px`,
                          height: `${item.screenHeight + 2}px`,
                          backgroundColor: bgHex,
                        }}
                        className="absolute z-10 pointer-events-none rounded-sm"
                      />

                      {/* Replacement text rendered at the moved position */}
                      <div
                        key={item.id}
                        onClick={() => handleSelectTextItem(item)}
                        title={`Texto editado: "${edit.newText}" (Clique para mover ou alterar)`}
                        style={{
                          left: `${movedL - 1}px`,
                          top: `${movedT - 1}px`,
                          minWidth: `${item.screenWidth + 2}px`,
                          height: `${item.screenHeight + 2}px`,
                          fontFamily: getCssFontFamily(edit.fontFamily),
                          fontWeight: edit.isBold ? 'bold' : 'normal',
                          fontStyle: edit.isItalic ? 'italic' : 'normal',
                          color: fgHex,
                        }}
                        className="absolute z-20 bg-white/95 border border-emerald-500/80 hover:border-brand-500 rounded px-1 shadow-sm flex items-center cursor-pointer group hover:scale-[1.01] transition-all"
                      >
                        <span
                          style={{
                            fontSize: `${edit.fontSize * scale}px`,
                            lineHeight: 1,
                          }}
                          className="whitespace-nowrap"
                        >
                          {edit.newText}
                        </span>
                        {hasMoved ? (
                          <span className="absolute -top-3.5 left-0 text-[8px] font-mono font-bold bg-amber-600 text-white px-1 rounded shadow opacity-90 group-hover:opacity-100 flex items-center gap-0.5">
                            <Move className="w-2.5 h-2.5" /> Reposicionado
                          </span>
                        ) : (
                          <span className="absolute -top-3.5 left-0 text-[8px] font-mono font-bold bg-emerald-600 text-white px-1 rounded shadow opacity-90 group-hover:opacity-100">
                            Editado
                          </span>
                        )}
                      </div>
                    </React.Fragment>
                  );
                }

                // Unedited text item: clickable hover box
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectTextItem(item)}
                    title={`Clique para selecionar, editar e mover: "${item.str}"`}
                    style={{
                      left: `${item.screenLeft}px`,
                      top: `${item.screenTop}px`,
                      width: `${item.screenWidth}px`,
                      height: `${item.screenHeight}px`,
                    }}
                    className="absolute transition-all duration-100 cursor-pointer flex items-center hover:bg-brand-500/20 hover:border hover:border-brand-500/70 rounded"
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Panel: Active Editor & Edits Ledger */}
        <aside className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full shrink-0">
          {/* Active Inline Editor */}
          <div className="p-4 border-b border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-brand-400" />
                {selectedText ? 'Alinhamento & Tipografia' : 'Clique em um texto'}
              </h3>
              {selectedText && (
                <button
                  onClick={() => setSelectedText(null)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {selectedText ? (
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                  <span className="text-slate-500 block mb-0.5 font-medium">Texto Original do PDF:</span>
                  <span className="text-slate-200 font-mono italic">"{selectedText.str}"</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Novo Texto:
                  </label>
                  <textarea
                    rows={2}
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    style={{
                      fontFamily: getCssFontFamily(fontFamily),
                      fontWeight: isBold ? 'bold' : 'normal',
                      fontStyle: isItalic ? 'italic' : 'normal',
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
                    placeholder="Digite o texto..."
                  />
                </div>

                {/* Typography Controls */}
                <div className="space-y-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Tipografia (Mesma do PDF)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value as any)}
                      className="flex-1 bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none"
                    >
                      <option value="sans">Sans (Arial / Helvetica)</option>
                      <option value="serif">Serif (Times New Roman)</option>
                      <option value="mono">Mono (Courier / Código)</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => setIsBold((b) => !b)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center border transition-colors ${
                        isBold ? 'bg-brand-600 border-brand-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                      title="Negrito"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsItalic((i) => !i)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center border transition-colors ${
                        isItalic ? 'bg-brand-600 border-brand-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'
                      }`}
                      title="Itálico"
                    >
                      I
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                    <span>Tamanho:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setFontSize((v) => Math.max(6, v - 1))}
                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center font-bold text-slate-300"
                      >
                        -
                      </button>
                      <span className="font-mono text-xs w-8 text-center font-bold">
                        {fontSize}pt
                      </span>
                      <button
                        onClick={() => setFontSize((v) => v + 1)}
                        className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center font-bold text-slate-300"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Free Movement & Alignment Details */}
                <div className="space-y-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                      <Move className="w-3 h-3 text-brand-400" />
                      Alinhamento Livre
                    </span>
                    {isCurrentSelectionMoved && (
                      <button
                        onClick={handleResetPosition}
                        className="text-[10px] text-amber-400 hover:underline flex items-center gap-0.5"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        Resetar
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
                    <div className="p-1.5 rounded bg-slate-800 border border-slate-700">
                      <span className="text-slate-500 block text-[9px]">Offset X:</span>
                      {deltaX > 0 ? `+${deltaX}` : deltaX} px
                    </div>
                    <div className="p-1.5 rounded bg-slate-800 border border-slate-700">
                      <span className="text-slate-500 block text-[9px]">Offset Y:</span>
                      {deltaY > 0 ? `+${deltaY}` : deltaY} px
                    </div>
                  </div>

                  {/* Micro-movement buttons */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-400">Micropassos:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleNudge(-1, 0)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold"
                      >
                        ←
                      </button>
                      <button
                        onClick={() => handleNudge(1, 0)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold"
                      >
                        →
                      </button>
                      <button
                        onClick={() => handleNudge(0, -1)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleNudge(0, 1)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleApplySingleEdit}
                  className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-600/30 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  Aplicar Alteração & Alinhamento
                </button>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
                <p>
                  Clique em qualquer texto do documento no centro para ativá-lo.
                </p>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] space-y-1.5 text-slate-400">
                  <div className="flex items-center gap-1.5 text-brand-400 font-semibold">
                    <Move className="w-3.5 h-3.5" />
                    Como Mover Livremente:
                  </div>
                  <div>1. Clique no texto que deseja editar.</div>
                  <div>2. Clique e arraste o botão <strong>"Mover"</strong> para posicionar onde quiser.</div>
                  <div>3. Use as setas do teclado (ou o D-Pad) para alinhar milimetricamente.</div>
                </div>
              </div>
            )}
          </div>

          {/* Ledger of Edits Made */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Alterações Realizadas ({edits.length})
              </span>
              {edits.length > 0 && (
                <button
                  onClick={() => setEdits([])}
                  className="text-[10px] text-rose-400 hover:underline"
                >
                  Limpar Todas
                </button>
              )}
            </div>

            {edits.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 text-center text-xs text-slate-500">
                Nenhuma alteração registrada ainda. Clique em qualquer texto para editar ou reposicionar.
              </div>
            ) : (
              <div className="space-y-2">
                {edits.map((e) => {
                  const hasMoved = e.origPdfX !== undefined && (Math.abs(e.origPdfX - e.pdfX) > 1 || Math.abs((e.origPdfY || 0) - e.pdfY) > 1);
                  return (
                    <div
                      key={e.id}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1 relative group"
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                          Página {e.pageNumber}
                          {hasMoved && (
                            <span className="px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono text-[9px]">
                              Alinhado
                            </span>
                          )}
                        </span>
                        <button
                          onClick={() => handleRemoveEdit(e.id)}
                          className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition-colors"
                          title="Desfazer alteração"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-rose-400/80 line-through truncate text-[11px]">
                        "{e.originalText}"
                      </div>
                      <div className="text-emerald-400 font-medium truncate text-[11px] flex items-center gap-1">
                        <ArrowRight className="w-3 h-3 shrink-0" />
                        "{e.newText}"
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
