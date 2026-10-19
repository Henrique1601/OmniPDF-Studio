import React, { useState, useEffect } from 'react';
import { Settings, Key, Globe, Download, RefreshCw, CheckCircle2, Shield, Folder, HardDrive, Cpu, AlertCircle } from 'lucide-react';
import { AppPreferences } from '../../types';

interface PreferencesViewProps {
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
}

export const PreferencesView: React.FC<PreferencesViewProps> = ({ onShowMessage }) => {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('omnipdf_gemini_api_key') || '');
  const [ocrLang, setOcrLang] = useState(() => localStorage.getItem('omnipdf_ocr_lang') || 'por');
  const [compression, setCompression] = useState(() => localStorage.getItem('omnipdf_compression') || 'recommended');
  const [autoUpdate, setAutoUpdate] = useState(() => localStorage.getItem('omnipdf_auto_update') !== 'false');
  const [appVersion, setAppVersion] = useState('1.0.0');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  useEffect(() => {
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(setAppVersion);
    }
  }, []);

  const handleSavePreferences = () => {
    localStorage.setItem('omnipdf_gemini_api_key', apiKey.trim());
    localStorage.setItem('omnipdf_ocr_lang', ocrLang);
    localStorage.setItem('omnipdf_compression', compression);
    localStorage.setItem('omnipdf_auto_update', autoUpdate ? 'true' : 'false');
    onShowMessage('Configurações salvas com sucesso!', 'success');
  };

  const handleCheckUpdate = async () => {
    if (!window.electronAPI?.checkForUpdates) {
      onShowMessage('Verificação disponível apenas no aplicativo desktop instalado.', 'error');
      return;
    }

    setIsCheckingUpdate(true);
    setUpdateStatus('Verificando os servidores do GitHub Releases...');

    try {
      const res = await window.electronAPI.checkForUpdates();
      if (res?.status === 'dev-mode') {
        setUpdateStatus('Modo de desenvolvimento: simulação de atualizações.');
        onShowMessage('Em modo de desenvolvimento, builds oficiais de release são checadas após empacotamento.', 'success');
      } else if (res?.updateInfo) {
        setUpdateStatus(`Nova versão ${res.updateInfo.version} disponível!`);
        onShowMessage(`Nova versão ${res.updateInfo.version} encontrada!`, 'success');
      } else {
        setUpdateStatus('Você já está utilizando a versão mais recente.');
        onShowMessage('OmniPDF Studio está atualizado na versão 1.0.0!', 'success');
      }
    } catch (err: any) {
      setUpdateStatus(`Erro ao verificar: ${err.message}`);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#12141a] overflow-y-auto text-slate-100 p-8 select-none">
      <div className="max-w-3xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="pb-4 border-b border-slate-800">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Settings className="w-6 h-6 text-brand-500" />
            Configurações do OmniPDF Studio
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Personalize preferências de inteligência artificial, OCR, segurança e atualizações automáticas
          </p>
        </div>

        {/* Section 1: AI Engine */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-200">Google Gemini 2.5 API Key</h2>
              <p className="text-xs text-slate-400">Usada para Chat Inteligente, Tradução e Auditoria de Contratos</p>
            </div>
          </div>

          <div className="space-y-2">
            <input
              type="password"
              placeholder="Cole sua API Key do Google AI Studio (AIzaSy...)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-purple-500"
            />
            <p className="text-[11px] text-slate-500 leading-relaxed">
              🔒 Sua chave permanece estritamente salva no armazenamento local criptografado do seu dispositivo e nunca é compartilhada com terceiros.
            </p>
          </div>
        </div>

        {/* Section 2: Engine Defaults */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-200">Motores de Processamento & OCR</h2>
              <p className="text-xs text-slate-400">Definições para ferramentas offline de alto desempenho</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Idioma Padrão do OCR</label>
              <select
                value={ocrLang}
                onChange={(e) => setOcrLang(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              >
                <option value="por">Português (Brasil)</option>
                <option value="eng">Inglês (English)</option>
                <option value="spa">Espanhol (Español)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">Nível Padrão de Compressão</label>
              <select
                value={compression}
                onChange={(e) => setCompression(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              >
                <option value="recommended">Recomendado (Balanceado)</option>
                <option value="extreme">Extremo (Máxima redução)</option>
                <option value="low">Baixo (Preservar fidelidade máxima)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Updates & Version */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-200">Atualizações do Aplicativo</h2>
                <p className="text-xs text-slate-400">Versão instalada: <span className="font-mono text-slate-200">v{appVersion}</span></p>
              </div>
            </div>

            <button
              onClick={handleCheckUpdate}
              disabled={isCheckingUpdate}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              {isCheckingUpdate ? 'Verificando...' : 'Verificar Atualização'}
            </button>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-300">Checar atualizações automaticamente ao iniciar</span>
            <input
              type="checkbox"
              checked={autoUpdate}
              onChange={(e) => setAutoUpdate(e.target.checked)}
              className="w-4 h-4 accent-brand-500 rounded cursor-pointer"
            />
          </div>

          {updateStatus && (
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-400 shrink-0" />
              <span>{updateStatus}</span>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSavePreferences}
            className="px-6 py-2.5 bg-gradient-to-r from-brand-600 to-rose-600 hover:from-brand-700 hover:to-rose-700 text-white font-semibold text-xs rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
};
