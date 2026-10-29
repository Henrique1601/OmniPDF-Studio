import React, { useState, useEffect, useRef } from 'react';
import { 
  Type, 
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
  FolderOpen
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
  const [fontSizeOffset, setFontSizeOffset] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  // Search & Replace states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [replaceTerm, setReplaceTerm] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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

        // 2. Extract text items with coordinate mapping
        const items = await PDFService.extractPageTextItems(
          currentFile.data,
          currentPage,
          scale
        );

        if (!isCancelled) {
          setDetectedTexts(items);
          setLoading(false);
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

  const handleSelectTextItem = (item: DetectedTextItem) => {
    // Check if item already has an edit
    const existingEdit = edits.find(
      (e) => e.pageNumber === currentPage && e.pdfX === item.pdfX && e.pdfY === item.pdfY
    );
    setSelectedText(item);
    setEditingValue(existingEdit ? existingEdit.newText : item.str);
    setFontSizeOffset(0);
  };

  const handleApplySingleEdit = () => {
    if (!selectedText) return;

    const newEdit: TextEditItem = {
      id: `edit-${currentPage}-${selectedText.pdfX}-${selectedText.pdfY}`,
      pageNumber: currentPage,
      pdfX: selectedText.pdfX,
      pdfY: selectedText.pdfY,
      pdfWidth: selectedText.pdfWidth,
      pdfHeight: selectedText.pdfHeight,
      originalText: selectedText.str,
      newText: editingValue,
      fontSize: Math.max(8, selectedText.fontSize + fontSizeOffset),
    };

    setEdits((prev) => {
      const filtered = prev.filter((e) => e.id !== newEdit.id);
      return [...filtered, newEdit];
    });

    onShowMessage(`Texto alterado na página ${currentPage}!`, 'success');
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
        id: `edit-${currentPage}-${item.pdfX}-${item.pdfY}`,
        pageNumber: currentPage,
        pdfX: item.pdfX,
        pdfY: item.pdfY,
        pdfWidth: item.pdfWidth,
        pdfHeight: item.pdfHeight,
        originalText: item.str,
        newText: replaced,
        fontSize: item.fontSize,
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
          onShowMessage(`PDF com texto editado salvo em: ${savePath}`, 'success');
        }
      } else {
        const blob = PDFService.createBlob(modifiedBytes);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Editado_${currentFile.name}`;
        a.click();
        URL.revokeObjectURL(url);
        onShowMessage('PDF editado baixado com sucesso!', 'success');
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

  if (!currentFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-center">
        <div className="w-20 h-20 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400 mb-5 shadow-2xl">
          <Type className="w-10 h-10 animate-pulse" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold mb-3 border border-brand-500/30">
          <Sparkles className="w-3.5 h-3.5" />
          NOVIDADE EXCLUSIVA
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Edição Direta de Texto do PDF (TrueEdit)</h3>
        <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
          Edição direta in-place: clique em qualquer texto para abrir a caixa de edição ao vivo sobre a página, digite o novo texto e veja a alteração em tempo real.
        </p>
        <button
          onClick={onOpenFile}
          className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all hover:scale-105 active:scale-95"
        >
          Selecionar PDF para Editar
        </button>
      </div>
    );
  }

  // Edits for current page
  const currentPageEdits = edits.filter((e) => e.pageNumber === currentPage);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
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
            ({detectedTexts.length} blocos de texto detectados)
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
              Salvar PDF Editado ({edits.length} alteraç{edits.length === 1 ? 'ão' : 'ões'})
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
                Mapeando textos da página {currentPage}...
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
                  (e) => e.pageNumber === currentPage && Math.abs(e.pdfX - item.pdfX) < 2 && Math.abs(e.pdfY - item.pdfY) < 2
                );
                const isSelected = selectedText?.id === item.id;

                // When currently editing this specific item inline:
                if (isSelected) {
                  return (
                    <div
                      key={item.id}
                      style={{
                        left: `${item.screenLeft - 2}px`,
                        top: `${item.screenTop - 2}px`,
                      }}
                      className="absolute z-40 flex items-center gap-1"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleApplySingleEdit();
                          if (e.key === 'Escape') setSelectedText(null);
                        }}
                        style={{
                          fontSize: `${Math.max(10, (item.fontSize + fontSizeOffset) * scale)}px`,
                          minWidth: `${Math.max(item.screenWidth + 16, 80)}px`,
                          height: `${item.screenHeight + 4}px`,
                        }}
                        className="bg-white text-slate-950 font-sans border-2 border-brand-500 rounded px-1.5 shadow-2xl focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleApplySingleEdit}
                        title="Confirmar alteração (Enter)"
                        className="h-full px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold shadow flex items-center"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedText(null)}
                        title="Cancelar (Esc)"
                        className="h-full px-1.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-xs shadow flex items-center"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

                // If already edited, render the replacement live covering the old text:
                if (edit) {
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectTextItem(item)}
                      title={`Texto editado: "${edit.newText}" (Clique para alterar)`}
                      style={{
                        left: `${item.screenLeft - 1}px`,
                        top: `${item.screenTop - 1}px`,
                        minWidth: `${item.screenWidth + 2}px`,
                        height: `${item.screenHeight + 2}px`,
                      }}
                      className="absolute z-20 bg-white border border-emerald-500/80 rounded px-1 shadow-sm flex items-center cursor-pointer group"
                    >
                      <span
                        style={{
                          fontSize: `${edit.fontSize * scale}px`,
                          color: '#0F172A',
                          lineHeight: 1,
                        }}
                        className="font-sans font-medium whitespace-nowrap"
                      >
                        {edit.newText}
                      </span>
                      <span className="absolute -top-3.5 left-0 text-[8px] font-mono font-bold bg-emerald-600 text-white px-1 rounded shadow opacity-90 group-hover:opacity-100">
                        Ao Vivo
                      </span>
                    </div>
                  );
                }

                // Unedited text item: clickable hover box
                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectTextItem(item)}
                    title={`Clique para editar diretamente: "${item.str}"`}
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
                {selectedText ? 'Editar Texto Selecionado' : 'Clique em um texto'}
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
                  <span className="text-slate-500 block mb-0.5 font-medium">Texto Original no PDF:</span>
                  <span className="text-slate-200 font-mono italic">"{selectedText.str}"</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Novo Texto Substituto:
                  </label>
                  <textarea
                    rows={3}
                    value={editingValue}
                    onChange={(e) => setEditingValue(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
                    placeholder="Digite o novo texto que substituirá o original..."
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Ajuste de Tamanho:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setFontSizeOffset((v) => v - 1)}
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center font-bold text-slate-300"
                    >
                      -
                    </button>
                    <span className="font-mono text-xs w-8 text-center">
                      {Math.round(selectedText.fontSize + fontSizeOffset)}pt
                    </span>
                    <button
                      onClick={() => setFontSizeOffset((v) => v + 1)}
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 flex items-center justify-center font-bold text-slate-300"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleApplySingleEdit}
                  className="w-full py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-md shadow-brand-600/30 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                >
                  <Check className="w-4 h-4" />
                  Aplicar Alteração
                </button>
              </div>
            ) : (
              <p className="text-xs text-slate-400 leading-relaxed">
                Passe o mouse sobre as palavras do documento no centro da tela e clique em qualquer trecho para alterá-lo diretamente.
              </p>
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
                Nenhuma alteração registrada ainda. Clique em qualquer texto para editar ou use a barra de busca acima.
              </div>
            ) : (
              <div className="space-y-2">
                {edits.map((e) => (
                  <div
                    key={e.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1 relative group"
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                      <span>Página {e.pageNumber}</span>
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
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
