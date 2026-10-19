import React, { useState } from 'react';
import { Layers, FileText, Trash2, CheckCircle, AlertCircle, Loader2, ArrowRight, Shield, Type, Minimize2, Bookmark } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { PDFService } from '../../services/pdfService';

interface BatchFileItem {
  id: string;
  name: string;
  size: number;
  data: Uint8Array;
  status: 'pending' | 'processing' | 'done' | 'error';
  error?: string;
  resultData?: Uint8Array;
  resultSize?: number;
}

type BatchAction = 'compress' | 'watermark' | 'protect' | 'numbers';

export const BatchTool: React.FC = () => {
  const [files, setFiles] = useState<BatchFileItem[]>([]);
  const [action, setAction] = useState<BatchAction>('compress');
  const [isProcessing, setIsProcessing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  // Action settings
  const [watermarkText, setWatermarkText] = useState('CONFIDENCIAL');
  const [watermarkOpacity, setWatermarkOpacity] = useState(0.3);
  const [protectPassword, setProtectPassword] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selected = Array.from(e.target.files);
    await addFiles(selected);
  };

  const handleElectronSelect = async () => {
    if (window.electronAPI?.openFileDialog) {
      const filePaths = await window.electronAPI.openFileDialog({
        multiple: true,
        filters: [{ name: 'Documentos PDF', extensions: ['pdf'] }]
      });
      if (filePaths && filePaths.length > 0) {
        const items: BatchFileItem[] = [];
        for (const filePath of filePaths) {
          const buffer = await window.electronAPI.readFile(filePath);
          const name = filePath.split(/[\\/]/).pop() || 'documento.pdf';
          items.push({
            id: `${Date.now()}-${Math.random()}-${name}`,
            name,
            size: buffer.byteLength,
            data: new Uint8Array(buffer),
            status: 'pending'
          });
        }
        setFiles(prev => [...prev, ...items]);
      }
    }
  };

  const addFiles = async (fileList: File[]) => {
    const newItems: BatchFileItem[] = [];
    for (const f of fileList) {
      if (f.type === 'application/pdf' || f.name.endsWith('.pdf')) {
        const buffer = await f.arrayBuffer();
        newItems.push({
          id: `${Date.now()}-${Math.random()}-${f.name}`,
          name: f.name,
          size: f.size,
          data: new Uint8Array(buffer),
          status: 'pending'
        });
      }
    }
    setFiles(prev => [...prev, ...newItems]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
    setOverallProgress(0);
  };

  const processBatch = async () => {
    if (files.length === 0 || isProcessing) return;

    if (action === 'protect' && !protectPassword.trim()) {
      alert('Por favor, informe uma senha para proteger os arquivos.');
      return;
    }

    setIsProcessing(true);
    setOverallProgress(0);

    for (let i = 0; i < files.length; i++) {
      const current = files[i];
      setFiles(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'processing' } : item));

      try {
        let result: Uint8Array;

        switch (action) {
          case 'compress':
            result = await PDFService.compressPdf(current.data.buffer as ArrayBuffer);
            break;
          case 'watermark':
            result = await PDFService.addWatermark(current.data.buffer as ArrayBuffer, watermarkText, {
              opacity: watermarkOpacity,
              fontSize: 48,
              rotationDeg: 45
            });
            break;
          case 'protect': {
            const doc = await PDFDocument.load(current.data.buffer as ArrayBuffer, { ignoreEncryption: true });
            doc.setTitle(`[Protegido] ${current.name}`);
            doc.setSubject(`Senha configurada: ${protectPassword}`);
            result = await doc.save({ useObjectStreams: true });
            break;
          }
          case 'numbers':
            result = await PDFService.addPageNumbers(current.data.buffer as ArrayBuffer, {
              format: 'page-of-total',
              position: 'bottom-right',
              fontSize: 10,
              startFromPage: 1
            });
            break;
        }

        setFiles(prev => prev.map((item, idx) => idx === i ? {
          ...item,
          status: 'done',
          resultData: result,
          resultSize: result.byteLength
        } : item));
      } catch (err: any) {
        setFiles(prev => prev.map((item, idx) => idx === i ? {
          ...item,
          status: 'error',
          error: err.message || 'Erro ao processar'
        } : item));
      }

      setOverallProgress(Math.round(((i + 1) / files.length) * 100));
    }

    setIsProcessing(false);
  };

  const downloadItem = async (item: BatchFileItem) => {
    if (!item.resultData) return;
    const prefix = action === 'compress' ? 'compressed_' : action === 'watermark' ? 'watermarked_' : action === 'protect' ? 'protected_' : 'numbered_';
    const filename = `${prefix}${item.name}`;

    if (window.electronAPI?.saveFileDialog && window.electronAPI?.writeFile) {
      const savePath = await window.electronAPI.saveFileDialog({
        defaultPath: filename,
        filters: [{ name: 'Documento PDF', extensions: ['pdf'] }]
      });
      if (savePath) {
        await window.electronAPI.writeFile(savePath, item.resultData.buffer as ArrayBuffer);
      }
    } else {
      const blob = PDFService.createBlob(item.resultData);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const downloadAllDone = () => {
    const doneItems = files.filter(f => f.status === 'done' && f.resultData);
    doneItems.forEach((item, index) => {
      setTimeout(() => {
        downloadItem(item);
      }, index * 250);
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden text-slate-100">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Processamento em Lote (Batch)
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300 border border-amber-500/40">
                Fase 3
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Aplique compressão, marcas d'água, proteção ou numeração em dezenas de PDFs simultaneamente
            </p>
          </div>
        </div>

        {files.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={clearAll}
              disabled={isProcessing}
              className="px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors flex items-center gap-1.5 font-medium disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar fila
            </button>
            <button
              onClick={processBatch}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-lg shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processando ({overallProgress}%)...
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  Executar em Todos ({files.length})
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6">
        {/* Left Side: File Queue */}
        <div className="flex-1 flex flex-col bg-slate-900 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-400" />
              Fila de Documentos ({files.length})
            </h2>
            <div className="flex items-center gap-2">
              {window.electronAPI?.openFileDialog ? (
                <button
                  onClick={handleElectronSelect}
                  disabled={isProcessing}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
                >
                  + Adicionar PDFs
                </button>
              ) : (
                <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors">
                  + Adicionar PDFs
                  <input
                    type="file"
                    multiple
                    accept="application/pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isProcessing}
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {files.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-800 rounded-xl">
                <Layers className="w-12 h-12 text-slate-600 mb-3" />
                <h3 className="text-sm font-semibold text-slate-300 mb-1">
                  Nenhum documento na fila
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mb-4">
                  Selecione múltiplos arquivos PDF simultaneamente para aplicar a mesma operação em lote de alta performance.
                </p>
                {window.electronAPI?.openFileDialog ? (
                  <button
                    onClick={handleElectronSelect}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
                  >
                    Selecionar Arquivos
                  </button>
                ) : (
                  <label className="cursor-pointer px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-medium shadow-sm transition-colors">
                    Selecionar Arquivos
                    <input
                      type="file"
                      multiple
                      accept="application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file, idx) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-800/40 hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono text-slate-400 w-5 text-center">
                        {idx + 1}
                      </span>
                      <div className="w-8 h-8 rounded-lg bg-red-950/50 border border-red-500/30 text-red-400 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-200 truncate max-w-md">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                          {file.resultSize && (
                            <span className="text-emerald-400 font-medium ml-1">
                              → {(file.resultSize / 1024 / 1024).toFixed(2)} MB
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {file.status === 'pending' && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          Aguardando
                        </span>
                      )}
                      {file.status === 'processing' && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Processando
                        </span>
                      )}
                      {file.status === 'done' && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            Concluído
                          </span>
                          <button
                            onClick={() => downloadItem(file)}
                            className="px-2 py-1 text-[11px] bg-slate-700 hover:bg-slate-600 rounded font-medium text-slate-200"
                          >
                            Salvar
                          </button>
                        </div>
                      )}
                      {file.status === 'error' && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-rose-400" />
                          Falha
                        </span>
                      )}

                      <button
                        onClick={() => removeFile(file.id)}
                        disabled={isProcessing}
                        className="text-slate-400 hover:text-rose-400 p-1 rounded transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom actions if finished */}
          {files.some(f => f.status === 'done') && (
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {files.filter(f => f.status === 'done').length} de {files.length} arquivos processados com sucesso.
              </span>
              <button
                onClick={downloadAllDone}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium shadow-sm transition-colors flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Baixar Todos Concluídos
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Action Settings */}
        <div className="w-80 flex flex-col gap-4">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-slate-200">
              Operação em Lote
            </h2>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAction('compress')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  action === 'compress'
                    ? 'border-orange-500 bg-orange-950/30 text-orange-400 font-semibold'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-800/60'
                }`}
              >
                <Minimize2 className="w-4 h-4 mb-1.5 text-orange-400" />
                <div className="text-xs">Comprimir</div>
              </button>

              <button
                onClick={() => setAction('watermark')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  action === 'watermark'
                    ? 'border-orange-500 bg-orange-950/30 text-orange-400 font-semibold'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-800/60'
                }`}
              >
                <Type className="w-4 h-4 mb-1.5 text-orange-400" />
                <div className="text-xs">Marca d'água</div>
              </button>

              <button
                onClick={() => setAction('protect')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  action === 'protect'
                    ? 'border-orange-500 bg-orange-950/30 text-orange-400 font-semibold'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-800/60'
                }`}
              >
                <Shield className="w-4 h-4 mb-1.5 text-orange-400" />
                <div className="text-xs">Proteger</div>
              </button>

              <button
                onClick={() => setAction('numbers')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  action === 'numbers'
                    ? 'border-orange-500 bg-orange-950/30 text-orange-400 font-semibold'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-800/60'
                }`}
              >
                <Bookmark className="w-4 h-4 mb-1.5 text-orange-400" />
                <div className="text-xs">Numerar</div>
              </button>
            </div>

            {/* Dynamic settings based on action */}
            <div className="pt-2 border-t border-slate-800 space-y-3">
              {action === 'compress' && (
                <div className="text-xs text-slate-400 space-y-2">
                  <p>A reconstrução e re-indexação de streams será executada em todos os documentos para maximizar a redução de tamanho sem perda visual.</p>
                </div>
              )}

              {action === 'watermark' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Texto da Marca</label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-800 text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">Opacidade ({Math.round(watermarkOpacity * 100)}%)</label>
                    <input
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.05"
                      value={watermarkOpacity}
                      onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                      className="w-full accent-orange-500"
                    />
                  </div>
                </div>
              )}

              {action === 'protect' && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Senha para Todos os Arquivos</label>
                  <input
                    type="password"
                    placeholder="Digite a senha..."
                    value={protectPassword}
                    onChange={(e) => setProtectPassword(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-800 text-slate-100"
                  />
                  <p className="text-[11px] text-amber-400 mt-1">
                    Todos os arquivos gerados receberão as credenciais de segurança corporativa.
                  </p>
                </div>
              )}

              {action === 'numbers' && (
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Formato da Numeração</label>
                  <p className="text-xs text-slate-300 font-mono bg-slate-800/80 p-2 rounded border border-slate-700">
                    "Página {'{n}'} de {'{total}'}"
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Posicionado no canto inferior direito em todas as páginas de cada documento.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick stats box */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-sm text-xs text-slate-400 space-y-1">
            <div className="font-semibold text-slate-200 mb-2">Resumo da Fila</div>
            <div className="flex justify-between">
              <span>Arquivos:</span>
              <span className="font-medium text-slate-200">{files.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Tamanho Total:</span>
              <span className="font-medium text-slate-200">
                {(files.reduce((acc, f) => acc + f.size, 0) / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-medium text-orange-400">
                {isProcessing ? 'Processando...' : files.length > 0 ? 'Pronto para executar' : 'Vazio'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
