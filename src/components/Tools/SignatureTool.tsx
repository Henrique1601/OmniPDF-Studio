import React, { useState, useRef, useEffect } from 'react';
import { 
  FileSignature, 
  Download, 
  Trash2, 
  Undo, 
  Check, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  Move,
  Maximize2
} from 'lucide-react';
import { PDFFileInfo } from '../../types';
import { PDFService } from '../../services/pdfService';

interface SignatureToolProps {
  currentFile: PDFFileInfo | null;
  onOpenFile: () => void;
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
  onFileUpdated?: (newFile: PDFFileInfo) => void;
}

export const SignatureTool: React.FC<SignatureToolProps> = ({
  currentFile,
  onOpenFile,
  onShowMessage,
  onFileUpdated,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [penColor, setPenColor] = useState<string>('#0b3b95'); // Classic legal pen blue
  const [penWidth, setPenWidth] = useState<number>(2.5);
  const [hasSignature, setHasSignature] = useState<boolean>(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // Position on PDF
  const [sigX, setSigX] = useState<number>(200);
  const [sigY, setSigY] = useState<number>(150);
  const [sigWidth, setSigWidth] = useState<number>(160);
  const [sigHeight, setSigHeight] = useState<number>(60);
  const [saving, setSaving] = useState<boolean>(false);

  // Canvas drawing state
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef<boolean>(false);

  useEffect(() => {
    if (currentFile) {
      PDFService.getPageCount(currentFile.data)
        .then((cnt) => setTotalPages(cnt))
        .catch(console.error);
    }
  }, [currentFile]);

  // Render current PDF page in background for positioning preview
  useEffect(() => {
    if (!currentFile || !pdfCanvasRef.current) return;
    PDFService.renderPageToCanvas(currentFile.data, currentPage, pdfCanvasRef.current, 0.8)
      .catch(console.error);
  }, [currentFile, currentPage]);

  // Drawing handlers for signature pad
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    isDrawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (isDrawingRef.current && sigCanvasRef.current) {
      isDrawingRef.current = false;
      setSignatureDataUrl(sigCanvasRef.current.toDataURL('image/png'));
    }
  };

  const clearSignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setSignatureDataUrl(null);
  };

  const handleApplySignature = async () => {
    if (!currentFile) return;
    if (!signatureDataUrl) {
      onShowMessage('Desenhe sua assinatura no painel antes de aplicar.', 'error');
      return;
    }

    try {
      setSaving(true);
      const signedBytes = await PDFService.addSignature(
        currentFile.data,
        signatureDataUrl,
        currentPage,
        {
          x: sigX,
          y: sigY,
          width: sigWidth,
          height: sigHeight,
        }
      );

      if (window.electronAPI) {
        const savePath = await window.electronAPI.saveFileDialog({
          defaultPath: `Assinado_${currentFile.name}`,
        });
        if (savePath) {
          await window.electronAPI.writeFile(savePath, signedBytes.buffer as ArrayBuffer);
          onShowMessage(`Documento assinado com sucesso em: ${savePath}`, 'success');
        }
      } else {
        const blob = PDFService.createBlob(signedBytes);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Assinado_${currentFile.name}`;
        a.click();
        URL.revokeObjectURL(url);
        onShowMessage('Documento assinado baixado com sucesso!', 'success');
      }

      if (onFileUpdated) {
        onFileUpdated({
          ...currentFile,
          data: signedBytes.buffer as ArrayBuffer,
        });
      }
    } catch (err: any) {
      onShowMessage(`Erro ao assinar documento: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!currentFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-center">
        <FileSignature className="w-12 h-12 text-brand-400 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-white mb-2">Selecione um PDF para Assinar</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Assine digitalmente seus contratos, propostas e termos com desenho manuscrito suave e posicione onde quiser.
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
          <FileSignature className="w-5 h-5 text-brand-400" />
          <h2 className="text-sm font-bold text-white">Assinatura Manuscrita & Carimbo no PDF</h2>
          <span className="text-xs text-slate-400">• Página {currentPage} de {totalPages}</span>
        </div>

        <button
          onClick={handleApplySignature}
          disabled={saving || !hasSignature}
          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-xs font-semibold shadow-lg shadow-brand-600/30 transition-all active:scale-95"
        >
          {saving ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Gravando Assinatura...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Gravar e Salvar PDF Assinado
            </>
          )}
        </button>
      </div>

      {/* Main Container: Pad on Left, Positioning Preview on Right */}
      <div className="flex-1 flex overflow-hidden">
        {/* Drawing & Settings Left Panel */}
        <div className="w-96 bg-slate-900 border-r border-slate-800 p-6 flex flex-col h-full overflow-y-auto space-y-5 shrink-0">
          <div>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              1. Desenhe sua Assinatura
            </h3>
            <div className="border border-slate-700 rounded-2xl bg-white p-2 shadow-inner">
              <canvas
                ref={sigCanvasRef}
                width={330}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-40 cursor-crosshair touch-none rounded-xl"
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-slate-400">Use o mouse ou caneta/touch</span>
              <button
                type="button"
                onClick={clearSignature}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar Assinatura
              </button>
            </div>
          </div>

          {/* Color & Pen Settings */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <label className="block text-xs font-semibold text-slate-300">Cor da Caneta:</label>
            <div className="flex gap-2">
              {[
                { hex: '#0b3b95', label: 'Azul Caneta' },
                { hex: '#000000', label: 'Preto' },
                { hex: '#1e293b', label: 'Grafite' },
              ].map((c) => (
                <button
                  key={c.hex}
                  onClick={() => setPenColor(c.hex)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                    penColor === c.hex
                      ? 'border-brand-500 bg-brand-500/20 text-white'
                      : 'border-slate-700 bg-slate-800 text-slate-300'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.hex }} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Position and Scale adjustments */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              2. Posicionamento na Página
            </h4>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Posição Horizontal (X):</span>
                <span className="font-mono text-slate-200">{sigX}px</span>
              </div>
              <input
                type="range"
                min="20"
                max="450"
                value={sigX}
                onChange={(e) => setSigX(parseInt(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Posição Vertical (Y da base):</span>
                <span className="font-mono text-slate-200">{sigY}px</span>
              </div>
              <input
                type="range"
                min="20"
                max="750"
                value={sigY}
                onChange={(e) => setSigY(parseInt(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Largura da Assinatura:</span>
                <span className="font-mono text-slate-200">{sigWidth}px</span>
              </div>
              <input
                type="range"
                min="80"
                max="300"
                value={sigWidth}
                onChange={(e) => {
                  const w = parseInt(e.target.value);
                  setSigWidth(w);
                  setSigHeight(Math.round(w * 0.38));
                }}
                className="w-full accent-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Right Preview Viewport */}
        <div className="flex-1 overflow-auto flex flex-col items-center justify-center p-8 bg-slate-950 relative">
          {/* Page Picker Toolbar */}
          <div className="mb-4 flex items-center space-x-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl shadow-lg">
            <span className="text-xs text-slate-300">Página de Destino:</span>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs text-white">{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Canvas with Live Signature Overlay */}
          <div className="relative shadow-2xl rounded border border-slate-700/80 bg-white overflow-hidden">
            <canvas ref={pdfCanvasRef} className="block" />

            {/* Simulated Live Signature Overlay on Preview */}
            {signatureDataUrl && (
              <div
                style={{
                  left: `${sigX * 0.8}px`,
                  bottom: `${sigY * 0.8}px`,
                  width: `${sigWidth * 0.8}px`,
                  height: `${sigHeight * 0.8}px`,
                }}
                className="absolute border-2 border-dashed border-brand-500 rounded p-1 bg-brand-500/10 flex items-center justify-center pointer-events-none transition-all shadow-md"
              >
                <img
                  src={signatureDataUrl}
                  alt="Assinatura"
                  className="w-full h-full object-contain"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
