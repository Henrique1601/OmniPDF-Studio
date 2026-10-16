import React, { useState } from 'react';
import { Minimize2, Download, FileText, CheckCircle2, Zap } from 'lucide-react';
import { PDFFileInfo } from '../../types';
import { PDFService } from '../../services/pdfService';

interface CompressToolProps {
  currentFile: PDFFileInfo | null;
  onOpenFile: () => void;
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
}

export const CompressTool: React.FC<CompressToolProps> = ({ currentFile, onOpenFile, onShowMessage }) => {
  const [processing, setProcessing] = useState<boolean>(false);
  const [compressedResult, setCompressedResult] = useState<{
    originalSize: number;
    newSize: number;
    bytes: Uint8Array;
  } | null>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleCompress = async () => {
    if (!currentFile) return;

    try {
      setProcessing(true);
      const compressedBytes = await PDFService.compressPdf(currentFile.data);
      setCompressedResult({
        originalSize: currentFile.size,
        newSize: compressedBytes.byteLength,
        bytes: compressedBytes,
      });
      onShowMessage('PDF otimizado com sucesso!', 'success');
    } catch (err: any) {
      onShowMessage(`Erro ao compactar PDF: ${err.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!compressedResult || !currentFile) return;

    try {
      if (window.electronAPI) {
        const savePath = await window.electronAPI.saveFileDialog({
          defaultPath: `Compactado_${currentFile.name}`,
        });
        if (savePath) {
          await window.electronAPI.writeFile(savePath, compressedResult.bytes.buffer as ArrayBuffer);
          onShowMessage(`Arquivo compactado salvo em: ${savePath}`, 'success');
        }
      } else {
        const blob = PDFService.createBlob(compressedResult.bytes);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Compactado_${currentFile.name}`;
        a.click();
        URL.revokeObjectURL(url);
        onShowMessage('Download concluído!', 'success');
      }
    } catch (err: any) {
      onShowMessage(`Erro ao salvar arquivo: ${err.message}`, 'error');
    }
  };

  if (!currentFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-center">
        <Minimize2 className="w-12 h-12 text-brand-400 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-white mb-2">Selecione um PDF para Compactar</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Reduza o tamanho do seu documento mantendo a qualidade visual para envio por e-mail ou upload.
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

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-8 overflow-y-auto">
      <div className="max-w-2xl w-full mx-auto space-y-6">
        <div className="border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Minimize2 className="w-6 h-6 text-brand-400" />
            Compactar & Otimizar PDF
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Remove objetos não referenciados e recompacta fluxos binários para diminuir o tamanho do arquivo.
          </p>
        </div>

        {/* File Info */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
          <FileText className="w-8 h-8 text-brand-400" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{currentFile.name}</h4>
            <p className="text-xs text-slate-400">
              Tamanho Atual: <strong className="text-slate-200">{formatSize(currentFile.size)}</strong> • {currentFile.pageCount || 1} páginas
            </p>
          </div>
        </div>

        {/* Optimization Options */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Perfil de Otimização Offline
          </h3>
          <div className="p-4 rounded-xl bg-brand-500/10 border border-brand-500/30 text-xs text-slate-300 space-y-1">
            <div className="font-semibold text-brand-300">Otimização Estrutural e Streams</div>
            <p className="text-slate-400 leading-relaxed">
              Otimiza a tabela cruzada de referências (XRef), empacota objetos em Object Streams comprimidos com FlateDecode e descarta metadados redundantes sem perda visual de texto ou vetores.
            </p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={handleCompress}
              disabled={processing}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-brand-600/30 transition-all hover:scale-105 active:scale-95"
            >
              {processing ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Otimizando...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Iniciar Otimização
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Card */}
        {compressedResult && (
          <div className="p-6 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5" />
              Otimização Concluída com Sucesso!
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Tamanho Original:</span>
                <span className="text-sm font-mono text-slate-300">{formatSize(compressedResult.originalSize)}</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-400 block">Novo Tamanho:</span>
                <span className="text-sm font-mono font-bold text-emerald-400">{formatSize(compressedResult.newSize)}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                Salvar PDF Otimizado
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
