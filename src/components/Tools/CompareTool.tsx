import React, { useState, useEffect, useRef } from 'react';
import { 
  GitCompare, 
  FolderOpen, 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { PDFFileInfo } from '../../types';
import { PDFService } from '../../services/pdfService';

interface CompareToolProps {
  initialFile: PDFFileInfo | null;
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
}

export const CompareTool: React.FC<CompareToolProps> = ({ initialFile, onShowMessage }) => {
  const [docA, setDocA] = useState<PDFFileInfo | null>(initialFile);
  const [docB, setDocB] = useState<PDFFileInfo | null>(null);
  const [page, setPage] = useState<number>(1);
  const [maxPages, setMaxPages] = useState<number>(1);

  const [textA, setTextA] = useState<string>('');
  const [textB, setTextB] = useState<string>('');
  const [diffSummary, setDiffSummary] = useState<{ identical: boolean; added: string[]; removed: string[] }>({
    identical: true,
    added: [],
    removed: [],
  });

  const canvasRefA = useRef<HTMLCanvasElement | null>(null);
  const canvasRefB = useRef<HTMLCanvasElement | null>(null);

  // Pick Document A or B
  const handlePickDocument = async (which: 'A' | 'B') => {
    try {
      if (window.electronAPI) {
        const paths = await window.electronAPI.openFileDialog({
          multiple: false,
          filters: [{ name: 'Documento PDF', extensions: ['pdf'] }],
        });
        if (paths && paths.length > 0) {
          const p = paths[0];
          const data = await window.electronAPI.readFile(p);
          const name = p.split(/[\\/]/).pop() || 'documento.pdf';
          const pageCount = await PDFService.getPageCount(data);
          const fileInfo: PDFFileInfo = {
            id: Math.random().toString(),
            name,
            path: p,
            size: data.byteLength,
            pageCount,
            data,
          };
          if (which === 'A') setDocA(fileInfo);
          else setDocB(fileInfo);
        }
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/pdf';
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const data = await file.arrayBuffer();
          const pageCount = await PDFService.getPageCount(data);
          const fileInfo: PDFFileInfo = {
            id: Math.random().toString(),
            name: file.name,
            size: file.size,
            pageCount,
            data,
          };
          if (which === 'A') setDocA(fileInfo);
          else setDocB(fileInfo);
        };
        input.click();
      }
    } catch (err: any) {
      onShowMessage(`Erro ao selecionar documento: ${err.message}`, 'error');
    }
  };

  useEffect(() => {
    const pagesA = docA?.pageCount || 1;
    const pagesB = docB?.pageCount || 1;
    setMaxPages(Math.max(pagesA, pagesB));
    setPage(1);
  }, [docA, docB]);

  // Render both pages and compute diff
  useEffect(() => {
    if (docA && canvasRefA.current && page <= (docA.pageCount || 1)) {
      PDFService.renderPageToCanvas(docA.data, page, canvasRefA.current, 0.75).catch(console.error);
      PDFService.extractPageTextItems(docA.data, page, 1.0)
        .then((items) => setTextA(items.map((i) => i.str).join(' ')))
        .catch(console.error);
    } else {
      setTextA('');
    }

    if (docB && canvasRefB.current && page <= (docB.pageCount || 1)) {
      PDFService.renderPageToCanvas(docB.data, page, canvasRefB.current, 0.75).catch(console.error);
      PDFService.extractPageTextItems(docB.data, page, 1.0)
        .then((items) => setTextB(items.map((i) => i.str).join(' ')))
        .catch(console.error);
    } else {
      setTextB('');
    }
  }, [docA, docB, page]);

  // Calculate text diff
  useEffect(() => {
    if (!textA && !textB) {
      setDiffSummary({ identical: true, added: [], removed: [] });
      return;
    }

    const wordsA = new Set(textA.split(/\s+/).filter(Boolean));
    const wordsB = new Set(textB.split(/\s+/).filter(Boolean));

    const removed = Array.from(wordsA).filter((w) => !wordsB.has(w)).slice(0, 15);
    const added = Array.from(wordsB).filter((w) => !wordsA.has(w)).slice(0, 15);

    const identical = textA.trim() === textB.trim();
    setDiffSummary({ identical, added, removed });
  }, [textA, textB]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Header */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <GitCompare className="w-5 h-5 text-brand-400" />
          <h2 className="text-sm font-bold text-white">Comparador de Versões (Side-by-Side Diff)</h2>
        </div>

        {/* Page Stepper */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs text-slate-200">
            Página {page} de {maxPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(maxPages, p + 1))}
            disabled={page >= maxPages}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Diff Status Badge */}
        {docA && docB && (
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            {diffSummary.identical ? (
              <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Páginas Idênticas
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
                <AlertCircle className="w-3.5 h-3.5" />
                Diferenças Detectadas
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Split Screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Document A */}
        <div className="flex-1 border-r border-slate-800 flex flex-col bg-slate-950/80 overflow-hidden">
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5 truncate max-w-[250px]">
              <FileText className="w-4 h-4" />
              Doc A (Original): {docA ? docA.name : 'Nenhum'}
            </span>
            <button
              onClick={() => handlePickDocument('A')}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-lg border border-slate-700 flex items-center gap-1"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Trocar Doc A
            </button>
          </div>

          <div className="flex-1 overflow-auto flex items-center justify-center p-6">
            {docA ? (
              <div className="shadow-2xl rounded border border-slate-700/80 bg-white">
                <canvas ref={canvasRefA} />
              </div>
            ) : (
              <button
                onClick={() => handlePickDocument('A')}
                className="p-8 border-2 border-dashed border-slate-800 rounded-2xl text-center text-xs text-slate-500 hover:border-slate-700"
              >
                Clique para selecionar o Documento A (Versão Anterior)
              </button>
            )}
          </div>
        </div>

        {/* Right Document B */}
        <div className="flex-1 flex flex-col bg-slate-950/80 overflow-hidden">
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 truncate max-w-[250px]">
              <FileText className="w-4 h-4" />
              Doc B (Nova Versão): {docB ? docB.name : 'Nenhum'}
            </span>
            <button
              onClick={() => handlePickDocument('B')}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded-lg border border-slate-700 flex items-center gap-1"
            >
              <FolderOpen className="w-3.5 h-3.5" />
              Trocar Doc B
            </button>
          </div>

          <div className="flex-1 overflow-auto flex items-center justify-center p-6">
            {docB ? (
              <div className="shadow-2xl rounded border border-slate-700/80 bg-white">
                <canvas ref={canvasRefB} />
              </div>
            ) : (
              <button
                onClick={() => handlePickDocument('B')}
                className="p-8 border-2 border-dashed border-slate-800 rounded-2xl text-center text-xs text-slate-500 hover:border-slate-700"
              >
                Clique para selecionar o Documento B (Versão Nova)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Diff Analysis Bar */}
      {docA && docB && !diffSummary.identical && (
        <div className="h-28 bg-slate-900 border-t border-slate-800 p-3 px-6 flex items-center justify-between gap-6 shrink-0 text-xs">
          {/* Removed words */}
          <div className="flex-1 min-w-0">
            <span className="text-rose-400 font-semibold block mb-1">
              Palavras Removidas do Doc A:
            </span>
            <div className="flex flex-wrap gap-1.5 overflow-hidden max-h-14">
              {diffSummary.removed.length > 0 ? (
                diffSummary.removed.map((w, i) => (
                  <span key={i} className="bg-rose-950/50 text-rose-300 border border-rose-800 px-1.5 py-0.5 rounded text-[10px] font-mono line-through">
                    {w}
                  </span>
                ))
              ) : (
                <span className="text-slate-500 text-[11px]">Nenhuma palavra excluída detectada.</span>
              )}
            </div>
          </div>

          {/* Added words */}
          <div className="flex-1 min-w-0">
            <span className="text-emerald-400 font-semibold block mb-1">
              Palavras Adicionadas no Doc B:
            </span>
            <div className="flex flex-wrap gap-1.5 overflow-hidden max-h-14">
              {diffSummary.added.length > 0 ? (
                diffSummary.added.map((w, i) => (
                  <span key={i} className="bg-emerald-950/50 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-mono">
                    +{w}
                  </span>
                ))
              ) : (
                <span className="text-slate-500 text-[11px]">Nenhuma palavra nova detectada.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
