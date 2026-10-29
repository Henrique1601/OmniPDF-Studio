import React, { useState } from 'react';
import { 
  Image as ImageIcon, 
  Download, 
  FileText, 
  CheckCircle2, 
  Layers, 
  FolderCheck,
  FolderOpen,
  Sparkles
} from 'lucide-react';
import { PDFFileInfo } from '../../types';
import { PDFService } from '../../services/pdfService';

interface ConvertToolProps {
  currentFile: PDFFileInfo | null;
  onOpenFile: () => void;
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
}

type ExportMode = 'all' | 'single' | 'range';

export const ConvertTool: React.FC<ConvertToolProps> = ({ currentFile, onOpenFile, onShowMessage }) => {
  const [exportMode, setExportMode] = useState<ExportMode>('all');
  const [selectedFormat, setSelectedFormat] = useState<'image/png' | 'image/jpeg'>('image/png');
  const [scale, setScale] = useState<number>(2.0); // 2x for crisp high resolution
  const [targetPage, setTargetPage] = useState<number>(1);
  const [customRange, setCustomRange] = useState<string>('1-5');
  const [processing, setProcessing] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);

  if (!currentFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-center">
        <ImageIcon className="w-12 h-12 text-brand-400 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-white mb-2">Selecione um PDF para Converter em Imagens</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Exporte páginas individuais ou todas as páginas do documento em lote em alta resolução PNG ou JPEG.
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

  const totalPages = currentFile.pageCount || 1;
  const baseName = currentFile.name.replace(/\.pdf$/i, '');
  const ext = selectedFormat === 'image/png' ? 'png' : 'jpg';

  // Parse page list based on mode
  const getPagesToExport = (): number[] => {
    if (exportMode === 'single') {
      return [targetPage];
    }
    if (exportMode === 'all') {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    // Range parsing: e.g. "1-3, 5, 8"
    const pages = new Set<number>();
    const parts = customRange.split(',').map((p) => p.trim());
    for (const part of parts) {
      if (part.includes('-')) {
        const [startStr, endStr] = part.split('-').map((s) => parseInt(s.trim(), 10));
        if (!isNaN(startStr) && !isNaN(endStr)) {
          const start = Math.max(1, Math.min(startStr, endStr));
          const end = Math.min(totalPages, Math.max(startStr, endStr));
          for (let p = start; p <= end; p++) pages.add(p);
        }
      } else {
        const num = parseInt(part, 10);
        if (!isNaN(num) && num >= 1 && num <= totalPages) {
          pages.add(num);
        }
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  const handleExport = async () => {
    const pagesToExport = getPagesToExport();
    if (pagesToExport.length === 0) {
      onShowMessage('Nenhuma página válida selecionada para exportação.', 'error');
      return;
    }

    try {
      setProcessing(true);
      setProgressPercent(0);

      // Single Page Export
      if (pagesToExport.length === 1) {
        const pageNum = pagesToExport[0];
        setProgressText(`Renderizando página ${pageNum}...`);
        
        const dataUrl = await PDFService.exportPageAsImage(
          currentFile.data,
          pageNum,
          selectedFormat,
          0.95,
          scale
        );

        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

        if (window.electronAPI) {
          const defaultName = `${baseName}_pag_${pageNum}.${ext}`;
          const savePath = await window.electronAPI.saveFileDialog({
            defaultPath: defaultName,
            filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
          });
          if (savePath) {
            await window.electronAPI.writeFile(savePath, bytes.buffer as ArrayBuffer);
            onShowMessage(`Imagem da página ${pageNum} salva em: ${savePath}`, 'success');
          }
        } else {
          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `${baseName}_pag_${pageNum}.${ext}`;
          a.click();
          onShowMessage(`Página ${pageNum} baixada como imagem!`, 'success');
        }
        return;
      }

      // Batch Export (Multiple Pages)
      if (window.electronAPI?.openDirectoryDialog) {
        // User selects destination folder in Electron
        const targetDir = await window.electronAPI.openDirectoryDialog();
        if (!targetDir) {
          setProcessing(false);
          return;
        }

        let firstSavedPath = '';

        for (let i = 0; i < pagesToExport.length; i++) {
          const pageNum = pagesToExport[i];
          const currentProgress = Math.round(((i + 1) / pagesToExport.length) * 100);
          setProgressPercent(currentProgress);
          setProgressText(`Exportando página ${pageNum} de ${totalPages} (${currentProgress}%)...`);
          window.electronAPI?.setProgressBar?.((i + 1) / pagesToExport.length);

          const dataUrl = await PDFService.exportPageAsImage(
            currentFile.data,
            pageNum,
            selectedFormat,
            0.95,
            scale
          );

          const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
          const binaryStr = atob(base64Data);
          const bytes = new Uint8Array(binaryStr.length);
          for (let b = 0; b < binaryStr.length; b++) bytes[b] = binaryStr.charCodeAt(b);

          const padPage = String(pageNum).padStart(3, '0');
          const filePath = `${targetDir}/${baseName}_pagina_${padPage}.${ext}`;
          if (!firstSavedPath) firstSavedPath = filePath;

          await window.electronAPI.writeFile(filePath, bytes.buffer as ArrayBuffer);
        }

        window.electronAPI?.setProgressBar?.(-1);
        onShowMessage(`Sucesso! ${pagesToExport.length} imagens salvas na pasta: ${targetDir}`, 'success');

        if (firstSavedPath && window.electronAPI?.showItemInFolder) {
          window.electronAPI.showItemInFolder(firstSavedPath);
        }
      } else {
        // Web fallback: download sequentially
        for (let i = 0; i < pagesToExport.length; i++) {
          const pageNum = pagesToExport[i];
          setProgressPercent(Math.round(((i + 1) / pagesToExport.length) * 100));
          setProgressText(`Baixando página ${pageNum} de ${totalPages}...`);

          const dataUrl = await PDFService.exportPageAsImage(
            currentFile.data,
            pageNum,
            selectedFormat,
            0.95,
            scale
          );

          const a = document.createElement('a');
          a.href = dataUrl;
          a.download = `${baseName}_pagina_${String(pageNum).padStart(3, '0')}.${ext}`;
          a.click();
          await new Promise((r) => setTimeout(r, 250));
        }
        onShowMessage(`${pagesToExport.length} imagens baixadas com sucesso!`, 'success');
      }
    } catch (err: any) {
      window.electronAPI?.setProgressBar?.(-1);
      onShowMessage(`Erro na exportação em lote: ${err.message}`, 'error');
    } finally {
      setProcessing(false);
      setProgressText('');
      setProgressPercent(0);
    }
  };

  const pagesToExportCount = getPagesToExport().length;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-8 overflow-y-auto">
      <div className="max-w-2xl w-full mx-auto space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <ImageIcon className="w-6 h-6 text-brand-400" />
            PDF para Imagens em Lote (PNG / JPG)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Converta página única, intervalos ou todo o documento em lote direto para uma pasta.
          </p>
        </div>

        {/* File Info */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
          <FileText className="w-8 h-8 text-brand-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{currentFile.name}</h4>
            <p className="text-xs text-slate-400">{totalPages} página(s) disponíveis para conversão</p>
          </div>
        </div>

        {/* Options */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5">
          {/* Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Modo de Exportação:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setExportMode('all')}
                className={`py-3 px-3 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all ${
                  exportMode === 'all'
                    ? 'bg-brand-500/20 text-brand-300 border-brand-500 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Todas as Páginas</span>
                <span className="text-[10px] text-slate-400 font-normal">Lote completo (1 a {totalPages})</span>
              </button>

              <button
                type="button"
                onClick={() => setExportMode('single')}
                className={`py-3 px-3 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all ${
                  exportMode === 'single'
                    ? 'bg-brand-500/20 text-brand-300 border-brand-500 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Página Única</span>
                <span className="text-[10px] text-slate-400 font-normal">Apenas 1 página</span>
              </button>

              <button
                type="button"
                onClick={() => setExportMode('range')}
                className={`py-3 px-3 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all ${
                  exportMode === 'range'
                    ? 'bg-brand-500/20 text-brand-300 border-brand-500 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Intervalo</span>
                <span className="text-[10px] text-slate-400 font-normal">Ex: 1-3, 5, 8</span>
              </button>
            </div>
          </div>

          {/* Conditional inputs based on mode */}
          {exportMode === 'single' && (
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Escolha a Página para Exportar: (1 a {totalPages})
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={targetPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (val >= 1 && val <= totalPages) setTargetPage(val);
                  }}
                  className="w-24 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 font-mono text-center font-bold"
                />
                <span className="text-xs text-slate-400">Página {targetPage} de {totalPages}</span>
              </div>
            </div>
          )}

          {exportMode === 'range' && (
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Digite o Intervalo de Páginas:
              </label>
              <input
                type="text"
                value={customRange}
                onChange={(e) => setCustomRange(e.target.value)}
                placeholder="Ex: 1-5, 8, 10-12"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                {pagesToExportCount} página(s) selecionada(s) para exportar.
              </span>
            </div>
          )}

          {/* Format Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Formato de Saída:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedFormat('image/png')}
                className={`py-2.5 px-4 rounded-xl text-xs font-semibold border flex flex-col items-center gap-0.5 transition-all ${
                  selectedFormat === 'image/png'
                    ? 'bg-brand-500/20 text-brand-300 border-brand-500 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <span>PNG (Sem Perdas)</span>
                <span className="text-[10px] text-slate-400 font-normal">Máxima nitidez e fidelidade</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedFormat('image/jpeg')}
                className={`py-2.5 px-4 rounded-xl text-xs font-semibold border flex flex-col items-center gap-0.5 transition-all ${
                  selectedFormat === 'image/jpeg'
                    ? 'bg-brand-500/20 text-brand-300 border-brand-500 shadow-sm'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                <span>JPEG (Comprimido)</span>
                <span className="text-[10px] text-slate-400 font-normal">Arquivos mais leves</span>
              </button>
            </div>
          </div>

          {/* Resolution Multiplier */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Resolução da Imagem:</label>
            <div className="flex gap-2">
              {[
                { scale: 1.0, label: 'Padrão (1x)' },
                { scale: 2.0, label: 'Alta Resolução (2x HD)' },
                { scale: 3.0, label: 'Ultra Nítido (3x)' },
              ].map((res) => (
                <button
                  key={res.scale}
                  type="button"
                  onClick={() => setScale(res.scale)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    scale === res.scale
                      ? 'bg-brand-500/20 text-brand-300 border-brand-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {res.label}
                </button>
              ))}
            </div>
          </div>

          {/* Progress Bar during Batch */}
          {processing && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 animate-in fade-in">
              <div className="flex justify-between items-center text-xs text-slate-300">
                <span className="font-medium">{progressText || 'Processando lote...'}</span>
                <span className="font-mono text-brand-400 font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-brand-600 to-rose-600 h-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleExport}
            disabled={processing || pagesToExportCount === 0}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-sm shadow-xl shadow-brand-600/30 transition-all hover:scale-105 active:scale-95"
          >
            {processing ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Exportando Lote ({progressPercent}%)...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>
                  {exportMode === 'all'
                    ? `Exportar Todas as ${totalPages} Páginas em Lote`
                    : exportMode === 'range'
                    ? `Exportar ${pagesToExportCount} Páginas em Lote`
                    : `Exportar Imagem da Página ${targetPage}`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
