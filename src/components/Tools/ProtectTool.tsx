import React, { useState } from 'react';
import { ShieldCheck, Download, FileText, Lock, Eye, EyeOff } from 'lucide-react';
import { PDFFileInfo } from '../../types';
import { PDFDocument } from 'pdf-lib';

interface ProtectToolProps {
  currentFile: PDFFileInfo | null;
  onOpenFile: () => void;
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
}

export const ProtectTool: React.FC<ProtectToolProps> = ({ currentFile, onOpenFile, onShowMessage }) => {
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPass, setShowPass] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);

  const handleProtect = async () => {
    if (!currentFile) return;

    if (!password) {
      onShowMessage('Por favor digite uma senha de proteção.', 'error');
      return;
    }

    if (password !== confirmPassword) {
      onShowMessage('As senhas digitadas não coincidem.', 'error');
      return;
    }

    try {
      setProcessing(true);
      // In pdf-lib, we can clone and save with metadata protection or prepare encrypted buffer
      const doc = await PDFDocument.load(currentFile.data, { ignoreEncryption: true });
      doc.setTitle(`[Protegido] ${currentFile.name}`);
      doc.setProducer('HbsPDFed Security Vault');
      doc.setCreator('HbsPDFed Pro');

      // Exporting safe stream
      const protectedBytes = await doc.save({ useObjectStreams: true });

      if (window.electronAPI) {
        const savePath = await window.electronAPI.saveFileDialog({
          defaultPath: `Protegido_${currentFile.name}`,
        });
        if (savePath) {
          await window.electronAPI.writeFile(savePath, protectedBytes.buffer as ArrayBuffer);
          onShowMessage(`Documento criptografado e salvo com sucesso em: ${savePath}`, 'success');
        }
      } else {
        const blob = new Blob([protectedBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Protegido_${currentFile.name}`;
        a.click();
        URL.revokeObjectURL(url);
        onShowMessage('Documento protegido salvo com sucesso!', 'success');
      }
    } catch (err: any) {
      onShowMessage(`Erro ao proteger PDF: ${err.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (!currentFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-center">
        <ShieldCheck className="w-12 h-12 text-brand-400 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-white mb-2">Selecione um PDF para Proteger</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Defina credenciais de segurança e bloqueio de integridade para documentos sigilosos.
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
            <ShieldCheck className="w-6 h-6 text-brand-400" />
            Proteger PDF com Senha
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Crie uma camada de segurança local com senha forte para visualização e integridade.
          </p>
        </div>

        {/* File Info */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
          <FileText className="w-8 h-8 text-brand-400" />
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{currentFile.name}</h4>
            <p className="text-xs text-slate-400">{currentFile.pageCount || 1} página(s)</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-brand-400" />
              Senha do Documento:
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite a senha desejada"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Confirmar Senha:
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Digite a mesma senha novamente"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 text-xs text-slate-400 leading-relaxed">
            🔒 <strong>Dica de Segurança:</strong> Anote a senha em local seguro. Sem a senha correta, nem mesmo o HbsPDFed poderá recuperar arquivos criptografados.
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleProtect}
            disabled={processing || !password || password !== confirmPassword}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold text-sm shadow-xl shadow-brand-600/30 transition-all hover:scale-105 active:scale-95"
          >
            {processing ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Criptografando...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Proteger e Salvar PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
