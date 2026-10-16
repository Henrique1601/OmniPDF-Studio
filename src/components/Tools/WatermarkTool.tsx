import React, { useState } from 'react';
import { Droplet, Download, FileText } from 'lucide-react';
import { PDFFileInfo } from '../../types';
import { PDFService } from '../../services/pdfService';

interface WatermarkToolProps {
  currentFile: PDFFileInfo | null;
  onOpenFile: () => void;
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
}

export const WatermarkTool: React.FC<WatermarkToolProps> = ({ currentFile, onOpenFile, onShowMessage }) => {
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENCIAL');
  const [fontSize, setFontSize] = useState<number>(54);
  const [opacity, setOpacity] = useState<number>(0.25);
  const [rotation, setRotation] = useState<number>(45);
  const [processing, setProcessing] = useState<boolean>(false);

  const handleApplyWatermark = async () => {
    if (!currentFile) return;
    if (!watermarkText.trim()) {
      onShowMessage('Digite o texto da marca d\'água.', 'error');
      return;
    }

    try {
      setProcessing(true);
      const watermarkedBytes = await PDFService.addWatermark(currentFile.data, watermarkText, {
        fontSize,
        opacity,
        rotationDeg: rotation,
      });

      if (window.electronAPI) {
        const savePath = await window.electronAPI.saveFileDialog({
          defaultPath: `ComMarca_${currentFile.name}`,
        });
        if (savePath) {
          await window.electronAPI.writeFile(savePath, watermarkedBytes.buffer as ArrayBuffer);
          onShowMessage(`Marca d'água aplicada e salva em: ${savePath}`, 'success');
        }
      } else {
        const blob = PDFService.createBlob(watermarkedBytes);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ComMarca_${currentFile.name}`;
        a.click();
        URL.revokeObjectURL(url);
        onShowMessage('PDF com marca d\'água gerado com sucesso!', 'success');
      }
    } catch (err: any) {
      onShowMessage(`Erro ao aplicar marca d'água: ${err.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (!currentFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-center">
        <Droplet className="w-12 h-12 text-brand-400 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-white mb-2">Selecione um PDF para Adicionar Marca d'Água</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Adicione carimbos textuais elegantes como "CONFIDENCIAL", "RASCUNHO" ou seu nome sobre as páginas.
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
            <Droplet className="w-6 h-6 text-brand-400" />
            Adicionar Marca d'Água
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Personalize texto, transparência e ângulo da marca d'água em todas as páginas.
          </p>
        </div>

        {/* File Info */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
          <FileText className="w-8 h-8 text-brand-400" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{currentFile.name}</h4>
            <p className="text-xs text-slate-400">{currentFile.pageCount || 1} página(s) receberão a marca.</p>
          </div>
        </div>

        {/* Options */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Texto da Marca d'Água:
            </label>
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="Ex: CONFIDENCIAL, RASCUNHO, CÓPIA"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tamanho da Fonte: ({fontSize}px)
              </label>
              <input
                type="range"
                min="24"
                max="96"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Opacidade / Transparência: ({Math.round(opacity * 100)}%)
              </label>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.05"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Ângulo de Rotação:
            </label>
            <div className="flex gap-3">
              {[0, 45, -45, 90].map((deg) => (
                <button
                  key={deg}
                  onClick={() => setRotation(deg)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    rotation === deg
                      ? 'bg-brand-500/20 text-brand-300 border-brand-500'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview Box */}
          <div className="h-32 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center overflow-hidden relative">
            <span
              className="font-bold text-red-500 select-none tracking-wider pointer-events-none transition-all"
              style={{
                fontSize: `${fontSize * 0.5}px`,
                opacity: opacity,
                transform: `rotate(${rotation}deg)`,
              }}
            >
              {watermarkText || 'PRÉVIA'}
            </span>
            <span className="absolute bottom-2 right-2 text-[10px] text-slate-500">
              Pré-visualização aproximada
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleApplyWatermark}
            disabled={processing || !watermarkText.trim()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-sm shadow-xl shadow-brand-600/30 transition-all hover:scale-105 active:scale-95"
          >
            {processing ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Aplicando Marca d'Água...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Aplicar e Salvar PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
