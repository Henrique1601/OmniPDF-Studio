import React, { useState } from 'react';
import { Search, Folder, FolderOpen, FileText, Loader2, Sparkles, ArrowRight, ExternalLink, Filter, CheckCircle2 } from 'lucide-react';
import { PDFFileInfo } from '../../types';
import { PDFService } from '../../services/pdfService';

interface FolderRagToolProps {
  onLoadFileToApp: (file: PDFFileInfo) => void;
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
}

interface IndexedDocument {
  name: string;
  path: string;
  size: number;
  pages: { pageNumber: number; text: string }[];
}

interface SearchResult {
  docName: string;
  docPath: string;
  pageNumber: number;
  snippet: string;
  score: number;
  rawDoc: IndexedDocument;
}

export const FolderRagTool: React.FC<FolderRagToolProps> = ({
  onLoadFileToApp,
  onShowMessage
}) => {
  const [selectedDir, setSelectedDir] = useState<string | null>(null);
  const [pdfFiles, setPdfFiles] = useState<{ name: string; path: string; size: number }[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [indexProgress, setIndexProgress] = useState(0);
  const [indexedDocs, setIndexedDocs] = useState<IndexedDocument[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  const handleSelectFolder = async () => {
    if (!window.electronAPI?.openDirectoryDialog || !window.electronAPI?.listPdfsInDirectory) {
      onShowMessage('A seleção de pastas requer o aplicativo desktop Windows.', 'error');
      return;
    }

    try {
      setIsScanning(true);
      const dir = await window.electronAPI.openDirectoryDialog();
      if (!dir) {
        setIsScanning(false);
        return;
      }

      setSelectedDir(dir);
      const files = await window.electronAPI.listPdfsInDirectory(dir);
      setPdfFiles(files);
      setIndexedDocs([]);
      setResults([]);
      onShowMessage(`${files.length} arquivos PDF encontrados na pasta selecionada!`, 'success');
    } catch (err: any) {
      onShowMessage(`Erro ao abrir pasta: ${err.message}`, 'error');
    } finally {
      setIsScanning(false);
    }
  };

  const handleIndexFolder = async () => {
    if (pdfFiles.length === 0 || !window.electronAPI?.readFile) return;

    setIsIndexing(true);
    setIndexProgress(0);
    const newIndexed: IndexedDocument[] = [];

    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      try {
        const buffer = await window.electronAPI.readFile(file.path);
        const pages = await PDFService.extractAllDocumentText(buffer);
        newIndexed.push({
          name: file.name,
          path: file.path,
          size: file.size,
          pages
        });
      } catch (e) {
        console.warn(`Erro ao indexar ${file.name}:`, e);
      }
      setIndexProgress(Math.round(((i + 1) / pdfFiles.length) * 100));
    }

    setIndexedDocs(newIndexed);
    setIsIndexing(false);
    onShowMessage(`Indexação concluída! ${newIndexed.length} PDFs estão prontos para busca semântica instantânea.`, 'success');
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || indexedDocs.length === 0) {
      setResults([]);
      return;
    }

    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
    const searchMatches: SearchResult[] = [];

    for (const doc of indexedDocs) {
      for (const page of doc.pages) {
        const pageLower = page.text.toLowerCase();
        let matches = 0;

        for (const term of queryTerms) {
          if (pageLower.includes(term)) {
            matches++;
          }
        }

        if (matches > 0) {
          // Extract matching snippet
          const firstTerm = queryTerms.find(t => pageLower.includes(t)) || queryTerms[0];
          const termIdx = pageLower.indexOf(firstTerm);
          const start = Math.max(0, termIdx - 60);
          const end = Math.min(page.text.length, termIdx + 140);
          const snippet = `...${page.text.substring(start, end).replace(/\n/g, ' ')}...`;

          searchMatches.push({
            docName: doc.name,
            docPath: doc.path,
            pageNumber: page.pageNumber,
            snippet,
            score: matches,
            rawDoc: doc
          });
        }
      }
    }

    // Sort by score descending
    searchMatches.sort((a, b) => b.score - a.score);
    setResults(searchMatches.slice(0, 30));
  };

  const openDocumentInApp = async (result: SearchResult) => {
    if (!window.electronAPI?.readFile) return;
    try {
      const buffer = await window.electronAPI.readFile(result.docPath);
      const pageCount = await PDFService.getPageCount(buffer);
      onLoadFileToApp({
        id: Math.random().toString(),
        name: result.docName,
        path: result.docPath,
        size: buffer.byteLength,
        pageCount,
        data: buffer,
        lastOpened: Date.now()
      });
      onShowMessage(`Documento "${result.docName}" carregado na página ${result.pageNumber}!`, 'success');
    } catch (err: any) {
      onShowMessage(`Erro ao abrir documento: ${err.message}`, 'error');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden text-slate-100">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Search className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Busca Semântica em Pastas (RAG Offline)
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 border border-blue-500/40">
                Local Vault
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Pesquise palavras-chave, valores, termos contratuais ou trechos em centenas de PDFs locais de uma só vez
            </p>
          </div>
        </div>

        <button
          onClick={handleSelectFolder}
          disabled={isScanning || isIndexing}
          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-xl text-xs font-medium shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <FolderOpen className="w-4 h-4" />
          {selectedDir ? 'Trocar Pasta' : 'Selecionar Pasta de PDFs'}
        </button>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Left Side: Folder & Index Status */}
        <div className="w-80 flex flex-col bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-sm space-y-4 shrink-0">
          <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Folder className="w-4 h-4 text-blue-400" />
            Diretório Conectado
          </h2>

          {selectedDir ? (
            <div className="space-y-3">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs break-all text-slate-300 font-mono">
                {selectedDir}
              </div>

              <div className="space-y-1 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span>PDFs Encontrados:</span>
                  <span className="font-semibold text-slate-200">{pdfFiles.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Indexados na Memória:</span>
                  <span className="font-semibold text-cyan-400">{indexedDocs.length}</span>
                </div>
              </div>

              {indexedDocs.length === 0 ? (
                <button
                  onClick={handleIndexFolder}
                  disabled={isIndexing || pdfFiles.length === 0}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl text-xs font-semibold shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isIndexing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Indexando ({indexProgress}%)...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Indexar Todos os PDFs ({pdfFiles.length})
                    </>
                  )}
                </button>
              ) : (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Índice vetorial ativo e pronto para buscas.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-slate-950 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
              Nenhuma pasta selecionada. Clique no botão superior para escolher uma pasta com seus documentos.
            </div>
          )}

          <div className="mt-auto pt-3 border-t border-slate-800 text-[11px] text-slate-500 leading-relaxed">
            💡 <strong>100% Offline:</strong> Os dados e textos nunca saem do seu computador. A busca opera na memória RAM local em frações de segundo.
          </div>
        </div>

        {/* Right Side: Search Input and Results */}
        <div className="flex-1 flex flex-col bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
          {/* Search Header */}
          <div className="p-4 border-b border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
              <input
                type="text"
                placeholder={indexedDocs.length > 0 ? "Digite termos para buscar (ex: 'R$ 5.000', 'cláusula de rescisão', 'nota fiscal')..." : "Indexe uma pasta para ativar a busca..."}
                disabled={indexedDocs.length === 0}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 rounded-xl border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {results.length > 0 ? (
              results.map((res, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 hover:bg-slate-800/60 transition-colors flex items-start justify-between gap-4 group"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="text-xs font-semibold text-slate-200 truncate">
                        {res.docName}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                        Página {res.pageNumber}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                        {res.score} ocorrência(s)
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed italic line-clamp-2 pl-6">
                      "{res.snippet}"
                    </p>
                  </div>

                  <button
                    onClick={() => openDocumentInApp(res)}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100"
                  >
                    Abrir no Leitor
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            ) : searchQuery.trim() && indexedDocs.length > 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 text-xs">
                Nenhum trecho correspondente encontrado para "{searchQuery}". Tente outros sinônimos.
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 text-xs">
                {indexedDocs.length > 0 ? 'Digite algo no campo acima para pesquisar instantaneamente.' : 'Selecione e indexe uma pasta para começar.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
