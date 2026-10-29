import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, Sparkles, CheckCircle2, AlertCircle, X, Shield, ArrowRight } from 'lucide-react';

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  updateData: {
    version?: string;
    releaseDate?: string;
    releaseNotes?: string;
  } | null;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ isOpen, onClose, updateData }) => {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState<number | null>(null);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (window.electronAPI?.onUpdaterStatus) {
      const unsub = window.electronAPI.onUpdaterStatus((data) => {
        if (data.status === 'downloading') {
          setDownloading(true);
          setProgress(data.percent || 0);
        window.electronAPI?.setProgressBar?.((data.percent || 0) / 100);
          if (data.bytesPerSecond) {
            setSpeed(data.bytesPerSecond);
          }
        } else if (data.status === 'downloaded') {
          setDownloading(false);
          setDownloaded(true);
          setProgress(100);
        window.electronAPI?.setProgressBar?.(-1);
        } else if (data.status === 'error') {
          setDownloading(false);
          setError(data.error || 'Erro ao processar atualização.');
        }
      });
      return () => unsub();
    }
  }, []);

  if (!isOpen) return null;

  const handleStartDownload = async () => {
    if (!window.electronAPI?.downloadUpdate) return;
    try {
      setError(null);
      setDownloading(true);
      await window.electronAPI.downloadUpdate();
    } catch (err: any) {
      setDownloading(false);
      setError(err.message || 'Falha ao iniciar download da atualização.');
    }
  };

  const handleInstallAndRestart = () => {
    if (window.electronAPI?.quitAndInstallUpdate) {
      window.electronAPI.quitAndInstallUpdate();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#18181b] border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden text-slate-100 space-y-5 p-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
              <RefreshCw className={`w-5 h-5 ${downloading ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Nova Versão Disponível!</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-mono">
                  v{updateData?.version || '1.1.0'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Uma nova versão do OmniPDF Studio foi publicada no repositório oficial.
              </p>
            </div>
          </div>

          {!downloading && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Release details */}
        <div className="p-4 bg-[#121214] rounded-2xl border border-slate-800 space-y-2 text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Notas da Atualização:
          </span>
          <div className="text-[11px] text-slate-400 leading-relaxed max-h-36 overflow-y-auto pr-1 space-y-1">
            {updateData?.releaseNotes ? (
              <p>{updateData.releaseNotes}</p>
            ) : (
              <ul className="space-y-1">
                <li>• Melhorias no motor TrueEdit e no processamento em lote.</li>
                <li>• Novos recursos de IA com suporte a LLM Local (Ollama) e Gemini 2.5 Flash.</li>
                <li>• Correções de estabilidade e renderização de PDF Canvas.</li>
              </ul>
            )}
          </div>
        </div>

        {/* Progress bar if downloading */}
        {downloading && (
          <div className="space-y-2 p-4 bg-slate-900 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200 flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-rose-400 animate-bounce" />
                Baixando atualização dentro do app...
              </span>
              <span className="font-mono text-rose-400 font-bold">{progress}%</span>
            </div>

            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex justify-between text-[11px] text-slate-500">
              <span>Instalação automatizada</span>
              {speed && <span>{(speed / 1024 / 1024).toFixed(1)} MB/s</span>}
            </div>
          </div>
        )}

        {/* Downloaded Success Banner */}
        {downloaded && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-3 text-xs text-emerald-300">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>O pacote da nova versão foi baixado com sucesso. Clique abaixo para aplicar e reiniciar o app instantaneamente.</span>
          </div>
        )}

        {/* Error notice */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 space-y-2.5 text-xs text-rose-300">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
            <div className="pt-1 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  const directUrl = 'https://github.com/Henrique1601/OmniPDF-Studio/releases/latest';
                  if (window.electronAPI?.openExternal) {
                    window.electronAPI.openExternal(directUrl);
                  } else {
                    window.open(directUrl, '_blank');
                  }
                }}
                className="px-3 py-1.5 bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 rounded-xl text-[11px] font-semibold transition-colors flex items-center gap-1.5"
              >
                <span>Baixar Instalador Direto (.exe)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-3">
          {!downloaded ? (
            <>
              <button
                onClick={onClose}
                disabled={downloading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition-colors disabled:opacity-50"
              >
                Lembrar Mais Tarde
              </button>
              <button
                onClick={handleStartDownload}
                disabled={downloading}
                className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-500/25 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {downloading ? `Baixando (${progress}%)...` : 'Baixar e Atualizar Agora'}
              </button>
            </>
          ) : (
            <button
              onClick={handleInstallAndRestart}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Instalar Atualização e Reiniciar OmniPDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
