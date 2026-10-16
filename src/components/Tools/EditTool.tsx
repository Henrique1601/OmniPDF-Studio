import React, { useState } from 'react';
import { PenTool, Download, FileText, Plus, Trash2 } from 'lucide-react';
import { PDFFileInfo } from '../../types';
import { PDFService } from '../../services/pdfService';

interface EditToolProps {
  currentFile: PDFFileInfo | null;
  onOpenFile: () => void;
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
}

interface TextAnnotation {
  id: string;
  text: string;
  x: number;
  y: number;
  size: number;
}

export const EditTool: React.FC<EditToolProps> = ({ currentFile, onOpenFile, onShowMessage }) => {
  const [selectedPage, setSelectedPage] = useState<number>(1);
  const [annotations, setAnnotations] = useState<TextAnnotation[]>([
    { id: '1', text: 'Nota adicionada via HbsPDFed', x: 50, y: 750, size: 14 },
  ]);
  const [newText, setNewText] = useState<string>('');
  const [posX, setPosX] = useState<number>(50);
  const [posY, setPosY] = useState<number>(700);
  const [textSize, setTextSize] = useState<number>(14);
  const [processing, setProcessing] = useState<boolean>(false);

  const handleAddAnnotation = () => {
    if (!newText.trim()) return;
    setAnnotations((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        text: newText,
        x: posX,
        y: posY,
        size: textSize,
      },
    ]);
    setNewText('');
  };

  const handleRemove = (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSaveAnnotated = async () => {
    if (!currentFile) return;

    try {
      setProcessing(true);
      const annotatedBytes = await PDFService.addAnnotations(currentFile.data, [
        {
          pageIndex: selectedPage - 1,
          texts: annotations.map((a) => ({
            text: a.text,
            x: a.x,
            y: a.y,
            size: a.size,
            colorHex: '#000000',
          })),
        },
      ]);

      if (window.electronAPI) {
        const savePath = await window.electronAPI.saveFileDialog({
          defaultPath: `Editado_${currentFile.name}`,
        });
        if (savePath) {
          await window.electronAPI.writeFile(savePath, annotatedBytes.buffer as ArrayBuffer);
          onShowMessage(`Documento anotado salvo em: ${savePath}`, 'success');
        }
      } else {
        const blob = PDFService.createBlob(annotatedBytes);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Editado_${currentFile.name}`;
        a.click();
        URL.revokeObjectURL(url);
        onShowMessage('PDF editado salvo com sucesso!', 'success');
      }
    } catch (err: any) {
      onShowMessage(`Erro ao gravar anotações: ${err.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (!currentFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-center">
        <PenTool className="w-12 h-12 text-brand-400 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-white mb-2">Selecione um PDF para Editar / Anotar</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Insira textos, observações e carimbos personalizados em qualquer página do documento.
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
            <PenTool className="w-6 h-6 text-brand-400" />
            Editar & Inserir Anotações
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Grave anotações permanentes diretamente na estrutura do documento PDF.
          </p>
        </div>

        {/* File and Target Page */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-brand-400" />
            <div>
              <h4 className="text-sm font-semibold text-white">{currentFile.name}</h4>
              <p className="text-xs text-slate-400">Página selecionada para anotação:</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={selectedPage}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (val >= 1 && val <= totalPages) setSelectedPage(val);
              }}
              className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-sm text-center text-white font-mono"
            />
            <span className="text-xs text-slate-400">de {totalPages}</span>
          </div>
        </div>

        {/* Add Annotation Form */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Adicionar Novo Texto
          </h3>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Texto da Nota:</label>
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="Digite o texto que deseja gravar no PDF"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Posição X (px):</label>
              <input
                type="number"
                value={posX}
                onChange={(e) => setPosX(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Posição Y (px):</label>
              <input
                type="number"
                value={posY}
                onChange={(e) => setPosY(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Tamanho da Fonte:</label>
              <input
                type="number"
                value={textSize}
                onChange={(e) => setTextSize(parseInt(e.target.value) || 12)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddAnnotation}
            disabled={!newText.trim()}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-brand-400 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Inserir Anotação na Lista
          </button>
        </div>

        {/* Current Annotations List */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Anotações Ativas na Página {selectedPage} ({annotations.length})
          </h4>
          {annotations.map((ann) => (
            <div
              key={ann.id}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs"
            >
              <div>
                <span className="text-white font-medium block">{ann.text}</span>
                <span className="text-slate-400 font-mono text-[11px]">
                  X: {ann.x} | Y: {ann.y} | Tam: {ann.size}pt
                </span>
              </div>
              <button
                onClick={() => handleRemove(ann.id)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSaveAnnotated}
            disabled={processing || annotations.length === 0}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-sm shadow-xl shadow-brand-600/30 transition-all hover:scale-105 active:scale-95"
          >
            {processing ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Gravando Edições...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Gravar e Salvar PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
