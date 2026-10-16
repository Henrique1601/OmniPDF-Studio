import React, { useState } from 'react';
import { Image as ImageIcon, Download, FileText, CheckCircle2 } from 'lucide-react';
import { PDFFileInfo } from '../../types';
import { PDFService } from '../../services/pdfService';

interface ConvertToolProps {
  currentFile: PDFFileInfo | null;
  onOpenFile: () => void;
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
}

export const ConvertTool: React.FC<ConvertToolProps> = ({ currentFile, onOpenFile, onShowMessage }) => {
  const [selectedFormat, setSelectedFormat] = useState<'image/png' | 'image/jpeg'>('image/png');
  const [scale, setScale] = useState<number>(2.0); // 2x for high resolution
  const [targetPage, setTargetPage] = useState<number>(1);
  const [processing, setProcessing] = useState<boolean>(false);

  const handleExportPage = async () => {
    if (!currentFile) return;

    try {
      setProcessing(true);
      const dataUrl = await PDFService.exportPageAsImage(
        currentFile.data,
        targetPage,
        selectedFormat,
        0.95,
        scale
      );

      const ext = selectedFormat === 'image/png' ? 'png' : 'jpg';
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
      const binaryStr = atob(base64Data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      if (window.electronAPI) {
        const defaultName = `${currentFile.name.replace(/\.pdf$/i, '')}_pag_${targetPage}.${ext}`;
        const savePath = await window.electronAPI.saveFileDialog({
          defaultPath: defaultName,
          filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
        });

        if (savePath) {
          await window.electronAPI.writeFile(savePath, bytes.buffer as ArrayBuffer);
          onShowMessage(`Imagem da página ${targetPage} salva em: ${savePath}`, 'success');
        }
      } else {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `Pagina_${targetPage}.${ext}`;
        a.click();
        onShowMessage(`Página ${targetPage} baixada como imagem!`, 'success');
      }
    } catch (err: any) {
      onShowMessage(`Erro ao exportar imagem: ${err.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (!currentFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-center">
        <ImageIcon className="w-12 h-12 text-brand-400 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-white mb-2">Selecione um PDF para Converter em Imagem</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Renderize as páginas do seu documento em imagens PNG de alta resolução ou JPEG otimizadas.
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

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-8 overflow-y-auto">
      <div className="max-w-2xl w-full mx-auto space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <ImageIcon className="w-6 h-6 text-brand-400" />
            PDF para Imagens (PNG / JPG)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Exporte as páginas do seu documento em arquivos de imagem nítidos para apresentações e web.
          </p>
        </div>

        {/* File Info */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
          <FileText className="w-8 h-8 text-brand-400" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{currentFile.name}</h4>
            <p className="text-xs text-slate-400">{totalPages} páginas disponíveis</p>
          </div>
        </div>

        {/* Options */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5">
          {/* Format Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Formato de Saída:</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedFormat('image/png')}
                className={`py-3 px-4 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all ${
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
                className={`py-3 px-4 rounded-xl text-xs font-semibold border flex flex-col items-center gap-1 transition-all ${
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

          {/* Page Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Escolher Página para Exportar: (1 a {totalPages})
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={totalPages}
                value={targetPage}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val >= 1 && val <= totalPages) setTargetPage(val);
                }}
                className="w-24 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500 font-mono text-center"
              />
              <span className="text-xs text-slate-400">Página {targetPage} de {totalPages}</span>
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
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleExportPage}
            disabled={processing}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-sm shadow-xl shadow-brand-600/30 transition-all hover:scale-105 active:scale-95"
          >
            {processing ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Renderizando Imagem...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Exportar Imagem da Página {targetPage}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
