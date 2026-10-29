import React, { useState, useEffect, useRef } from 'react';
import { 
  Droplet, 
  Download, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Check, 
  Sparkles,
  Palette
} from 'lucide-react';
import { PDFFileInfo } from '../../types';
import { PDFService } from '../../services/pdfService';

interface WatermarkToolProps {
  currentFile: PDFFileInfo | null;
  onOpenFile: () => void;
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
  onFileUpdated?: (newFile: PDFFileInfo) => void;
}

export const WatermarkTool: React.FC<WatermarkToolProps> = ({
  currentFile,
  onOpenFile,
  onShowMessage,
  onFileUpdated,
}) => {
  const [watermarkText, setWatermarkText] = useState<string>('CONFIDENCIAL');
  const [fontSize, setFontSize] = useState<number>(54);
  const [opacity, setOpacity] = useState<number>(0.28);
  const [rotation, setRotation] = useState<number>(45); // 45° diagonal subindo (padrão)
  const [selectedColor, setSelectedColor] = useState<string>('#DC2626'); // Red
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loadingPage, setLoadingPage] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewScale = 0.85;

  const colorPresets = [
    { hex: '#DC2626', label: 'Vermelho Carimbo' },
    { hex: '#64748B', label: 'Cinza Marca d\'Água' },
    { hex: '#2563EB', label: 'Azul Corporativo' },
    { hex: '#0F172A', label: 'Preto / Escuro' },
    { hex: '#16A34A', label: 'Verde Aprovado' },
    { hex: '#D97706', label: 'Âmbar Atenção' },
  ];

  const anglePresets = [
    { deg: 45, label: '45° (Diagonal Subindo)' },
    { deg: -45, label: '-45° (Diagonal Descendo)' },
    { deg: 0, label: '0° (Horizontal)' },
    { deg: 90, label: '90° (Vertical)' },
  ];

  // Get total pages
  useEffect(() => {
    if (currentFile) {
      PDFService.getPageCount(currentFile.data)
        .then((cnt) => setTotalPages(cnt))
        .catch(console.error);
    }
  }, [currentFile]);

  // Render real PDF page onto preview canvas
  useEffect(() => {
    if (!currentFile || !canvasRef.current) return;
    setLoadingPage(true);

    let isCancelled = false;
    PDFService.renderPageToCanvas(
      currentFile.data,
      currentPage,
      canvasRef.current,
      previewScale
    )
      .then(() => {
        if (!isCancelled) setLoadingPage(false);
      })
      .catch((err) => {
        console.error('Erro ao renderizar prévia da página:', err);
        if (!isCancelled) setLoadingPage(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [currentFile, currentPage]);

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
        colorHex: selectedColor,
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

      if (onFileUpdated) {
        onFileUpdated({
          ...currentFile,
          data: watermarkedBytes.buffer as ArrayBuffer,
        });
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
          Adicione carimbos textuais elegantes como "CONFIDENCIAL", "RASCUNHO" ou seu nome sobre as páginas com visualização ao vivo no documento real.
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
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Top Header */}
      <div className="h-14 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Droplet className="w-5 h-5 text-brand-400" />
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              Marca d'Água no Documento
            </h2>
            <p className="text-[11px] text-slate-400">
              Visualização ao vivo sobre o PDF real com ângulos e cores sincronizados
            </p>
          </div>
        </div>

        <button
          onClick={handleApplyWatermark}
          disabled={processing || !watermarkText.trim()}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all hover:scale-105 active:scale-95"
        >
          {processing ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Aplicando Marca...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Aplicar em Todas as Páginas ({totalPages})
            </>
          )}
        </button>
      </div>

      {/* Main Layout: Split Screen (Left: Controls, Right: Real PDF Preview) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Controls Sidebar */}
        <div className="w-80 md:w-96 bg-slate-900/80 border-r border-slate-800 p-6 overflow-y-auto space-y-5 shrink-0">
          {/* Text Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Texto da Marca d'Água:
            </label>
            <input
              type="text"
              value={watermarkText}
              onChange={(e) => setWatermarkText(e.target.value)}
              placeholder="Ex: CONFIDENCIAL, RASCUNHO, COPIA"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500 font-bold"
            />
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-2">
              Cor da Marca:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {colorPresets.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setSelectedColor(c.hex)}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
                    selectedColor === c.hex
                      ? 'border-white bg-slate-800 text-white shadow-sm ring-1 ring-white/50'
                      : 'border-slate-700/80 bg-slate-850 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0 border border-white/20"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="truncate">{c.label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Angle Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1.5">
              Ângulo de Rotação: ({rotation}°)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {anglePresets.map((a) => (
                <button
                  key={a.deg}
                  type="button"
                  onClick={() => setRotation(a.deg)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-medium border transition-all text-left ${
                    rotation === a.deg
                      ? 'bg-brand-500/20 text-brand-300 border-brand-500 font-semibold'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Size Slider */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-200">
                Tamanho da Fonte:
              </label>
              <span className="text-xs font-mono text-brand-400">{fontSize} pt</span>
            </div>
            <input
              type="range"
              min="20"
              max="110"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              className="w-full accent-brand-500"
            />
          </div>

          {/* Opacity Slider */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold text-slate-200">
                Transparência / Opacidade:
              </label>
              <span className="text-xs font-mono text-brand-400">{Math.round(opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.85"
              step="0.05"
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="w-full accent-brand-500"
            />
          </div>

          {/* Document Summary */}
          <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300">
              <FileText className="w-3.5 h-3.5 text-brand-400" />
              <span className="truncate">{currentFile.name}</span>
            </div>
            <p>A marca d'água será aplicada com fidelidade vetorial nas {totalPages} páginas.</p>
          </div>
        </div>

        {/* Right: Live PDF Document Preview with Overlaid Watermark */}
        <div className="flex-1 overflow-auto flex flex-col items-center justify-start p-6 bg-slate-950/95 relative">
          {/* Page Switcher Bar */}
          <div className="mb-4 flex items-center space-x-3 bg-slate-900 border border-slate-800 px-4 py-1.5 rounded-xl shadow-lg shrink-0">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs text-white">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-[11px] text-slate-400 ml-2 border-l border-slate-800 pl-3 hidden sm:inline">
              Visualização fiel sobre o documento real
            </span>
          </div>

          {/* Real PDF Canvas with Live Watermark Overlay */}
          <div className="relative shadow-2xl rounded border border-slate-700/80 bg-white overflow-hidden shrink-0">
            {loadingPage && (
              <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10">
                <span className="w-6 h-6 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
              </div>
            )}
            
            {/* The Real Document Canvas */}
            <canvas ref={canvasRef} className="block" />

            {/* Overlaid Watermark (anchored to the absolute center of the real page) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              <span
                className="font-extrabold select-none tracking-widest transition-all text-center whitespace-nowrap"
                style={{
                  fontSize: `${fontSize * previewScale}px`,
                  opacity: opacity,
                  color: selectedColor,
                  // -rotation in CSS rotates counter-clockwise visually to match PDF-lib coordinates
                  transform: `rotate(${-rotation}deg)`,
                  textShadow: '0 0 1px rgba(0,0,0,0.1)',
                }}
              >
                {watermarkText || 'CONFIDENCIAL'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
