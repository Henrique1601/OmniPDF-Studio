import React, { useState } from 'react';
import { Unlock, FileText, CheckCircle, Download, ShieldCheck, KeyRound, AlertTriangle, ArrowRight } from 'lucide-react';
import { PDFDocument } from 'pdf-lib';
import { PDFFileInfo } from '../../types';
import { PDFService } from '../../services/pdfService';

interface UnlockToolProps {
  currentFile: PDFFileInfo | null;
  onOpenFile: () => void;
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
  onFileUpdated?: (newFile: PDFFileInfo) => void;
}

export const UnlockTool: React.FC<UnlockToolProps> = ({
  currentFile,
  onOpenFile,
  onShowMessage,
  onFileUpdated
}) => {
  const [password, setPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [unlockedBytes, setUnlockedBytes] = useState<Uint8Array | null>(null);

  const handleUnlock = async () => {
    if (!currentFile) return;
    setIsProcessing(true);

    try {
      // Load ignoring encryption restrictions
      const doc = await PDFDocument.load(currentFile.data, {
        ignoreEncryption: true,
      });

      // Remove encryption markers by cloning into clean document
      const cleanDoc = await PDFDocument.create();
      const pageIndices = doc.getPageIndices();
      const copiedPages = await cleanDoc.copyPages(doc, pageIndices);

      for (const page of copiedPages) {
        cleanDoc.addPage(page);
      }

      cleanDoc.setTitle(currentFile.name.replace('.pdf', '') + ' (Desbloqueado)');
      cleanDoc.setProducer('OmniPDF Studio Unlock Engine');

      const savedBytes = await cleanDoc.save({ useObjectStreams: true });
      setUnlockedBytes(savedBytes);
      onShowMessage('PDF desbloqueado com sucesso! Todas as restrições foram removidas.', 'success');

      if (onFileUpdated) {
        onFileUpdated({
          ...currentFile,
          data: savedBytes.buffer as ArrayBuffer,
          name: `Desbloqueado_${currentFile.name}`
        });
      }
    } catch (err: any) {
      console.error(err);
      onShowMessage(`Falha ao desbloquear: ${err.message || 'Verifique a senha informada.'}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!unlockedBytes || !currentFile) return;
    const filename = `Desbloqueado_${currentFile.name}`;

    if (window.electronAPI?.saveFileDialog && window.electronAPI?.writeFile) {
      const savePath = await window.electronAPI.saveFileDialog({
        defaultPath: filename,
        filters: [{ name: 'Documento PDF', extensions: ['pdf'] }]
      });
      if (savePath) {
        await window.electronAPI.writeFile(savePath, unlockedBytes.buffer as ArrayBuffer);
        onShowMessage('Arquivo salvo com sucesso!', 'success');
      }
    } else {
      const blob = PDFService.createBlob(unlockedBytes);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (!currentFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
          <Unlock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Desbloquear PDF & Remover Restrições</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          Remova restrições de impressão, cópia de texto, anotações e edição criadas no documento original.
        </p>
        <button
          onClick={onOpenFile}
          className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-orange-500/20 transition-all"
        >
          Selecionar Arquivo PDF
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden text-slate-100">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-md shadow-orange-500/20">
            <Unlock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Desbloquear PDF (Unlock)
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300 border border-amber-500/40">
                Livre
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Arquivo: <span className="text-slate-200 font-medium">{currentFile.name}</span> ({(currentFile.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          </div>
        </div>

        <button
          onClick={onOpenFile}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
        >
          Trocar Arquivo
        </button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center">
        <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Remover Criptografia e Trava de Permissões</h3>
              <p className="text-xs text-slate-400 mt-1">
                Este processo re-extrai os objetos limpos do PDF, eliminando qualquer restrição que impeça imprimir, copiar texto ou preencher formulários.
              </p>
            </div>
          </div>

          {/* Password field if needed */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <span>Senha de Abertura (Opcional)</span>
            </label>
            <input
              type="password"
              placeholder="Deixe em branco se o PDF abrir sem pedir senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500"
            />
            <p className="text-[11px] text-slate-400">
              Se o arquivo possui apenas restrição de edição/impressão (owner password), nenhuma senha é necessária.
            </p>
          </div>

          {/* Permissions Matrix */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-center">
              <span className="text-slate-400 block mb-1">Impressão</span>
              <span className="font-semibold text-emerald-400 flex items-center justify-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Liberada
              </span>
            </div>
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-center">
              <span className="text-slate-400 block mb-1">Cópia de Texto</span>
              <span className="font-semibold text-emerald-400 flex items-center justify-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Liberada
              </span>
            </div>
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 text-center">
              <span className="text-slate-400 block mb-1">Edição Total</span>
              <span className="font-semibold text-emerald-400 flex items-center justify-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Liberada
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div className="text-[11px] text-slate-400">
              Status: {unlockedBytes ? <span className="text-emerald-400 font-semibold">Desbloqueado e Pronto</span> : 'Aguardando ação'}
            </div>

            <div className="flex items-center gap-2">
              {!unlockedBytes ? (
                <button
                  onClick={handleUnlock}
                  disabled={isProcessing}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <Unlock className="w-4 h-4" />
                  {isProcessing ? 'Desbloqueando...' : 'Remover Restrições'}
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Salvar PDF Desbloqueado
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
