import React, { useState } from 'react';
import { FileImage, Plus, Trash2, ArrowUp, ArrowDown, Download, CheckCircle2 } from 'lucide-react';
import { PDFService } from '../../services/pdfService';

interface ImageItem {
  id: string;
  name: string;
  size: number;
  type: 'image/png' | 'image/jpeg';
  data: ArrayBuffer;
  previewUrl: string;
}

interface ImagesToPdfToolProps {
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
}

export const ImagesToPdfTool: React.FC<ImagesToPdfToolProps> = ({ onShowMessage }) => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [processing, setProcessing] = useState<boolean>(false);

  const handleAddImages = async () => {
    try {
      if (window.electronAPI) {
        const paths = await window.electronAPI.openFileDialog({
          multiple: true,
          filters: [{ name: 'Imagens (PNG, JPG)', extensions: ['png', 'jpg', 'jpeg'] }],
        });

        if (paths && paths.length > 0) {
          const newImages: ImageItem[] = [];
          for (const p of paths) {
            const data = await window.electronAPI.readFile(p);
            const name = p.split(/[\\/]/).pop() || 'imagem.png';
            const isPng = name.toLowerCase().endsWith('.png');
            const type = isPng ? 'image/png' : 'image/jpeg';
            const blob = new Blob([data], { type });
            const previewUrl = URL.createObjectURL(blob);

            newImages.push({
              id: Math.random().toString(),
              name,
              size: data.byteLength,
              type,
              data,
              previewUrl,
            });
          }
          setImages((prev) => [...prev, ...newImages]);
        }
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'image/png, image/jpeg';
        input.onchange = async (e: any) => {
          const files: FileList = e.target.files;
          const newImages: ImageItem[] = [];
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const data = await file.arrayBuffer();
            const isPng = file.type === 'image/png';
            newImages.push({
              id: Math.random().toString(),
              name: file.name,
              size: file.size,
              type: isPng ? 'image/png' : 'image/jpeg',
              data,
              previewUrl: URL.createObjectURL(file),
            });
          }
          setImages((prev) => [...prev, ...newImages]);
        };
        input.click();
      }
    } catch (err: any) {
      onShowMessage(`Erro ao selecionar imagens: ${err.message}`, 'error');
    }
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= images.length) return;
    const updated = [...images];
    const temp = updated[index];
    updated[index] = updated[target];
    updated[target] = temp;
    setImages(updated);
  };

  const handleRemove = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConvertAndSave = async () => {
    if (images.length === 0) return;

    try {
      setProcessing(true);
      const pdfBytes = await PDFService.imagesToPdf(
        images.map((img) => ({ data: img.data, type: img.type }))
      );

      if (window.electronAPI) {
        const savePath = await window.electronAPI.saveFileDialog({
          defaultPath: 'Imagens_Convertidas.pdf',
        });
        if (savePath) {
          await window.electronAPI.writeFile(savePath, pdfBytes.buffer as ArrayBuffer);
          onShowMessage(`PDF gerado e salvo em: ${savePath}`, 'success');
        }
      } else {
        const blob = PDFService.createBlob(pdfBytes);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Imagens_Convertidas.pdf';
        a.click();
        URL.revokeObjectURL(url);
        onShowMessage('PDF gerado a partir das imagens com sucesso!', 'success');
      }
    } catch (err: any) {
      onShowMessage(`Erro ao converter imagens em PDF: ${err.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 p-8 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto space-y-6">
        <div className="border-b border-slate-800 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
              <FileImage className="w-6 h-6 text-brand-400" />
              Imagens para PDF
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Transforme fotos, recibos ou capturas de tela (JPG/PNG) em um documento PDF organizado.
            </p>
          </div>

          <button
            onClick={handleAddImages}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 text-brand-400" />
            Adicionar Imagens
          </button>
        </div>

        {images.length === 0 ? (
          <div className="border-2 border-dashed border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
            <FileImage className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">Nenhuma imagem adicionada</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Selecione imagens PNG ou JPG para compilar em um único arquivo PDF.
            </p>
            <button
              onClick={handleAddImages}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold"
            >
              Escolher Imagens
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {images.map((img, idx) => (
              <div
                key={img.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                    {idx + 1}
                  </span>
                  <img
                    src={img.previewUrl}
                    alt={img.name}
                    className="w-12 h-12 rounded object-cover border border-slate-700"
                  />
                  <div>
                    <h4 className="text-sm font-medium text-slate-200">{img.name}</h4>
                    <p className="text-[11px] text-slate-400">
                      {(img.size / 1024).toFixed(1)} KB • {img.type.replace('image/', '').toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleMove(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMove(idx, 'down')}
                    disabled={idx === images.length - 1}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRemove(idx)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 hover:text-rose-400 text-slate-400 transition-colors ml-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {images.length > 0 && (
          <div className="pt-4 flex justify-end">
            <button
              onClick={handleConvertAndSave}
              disabled={processing}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-sm shadow-xl shadow-brand-600/30 transition-all hover:scale-105 active:scale-95"
            >
              {processing ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Converter {images.length} Imagens em PDF
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
