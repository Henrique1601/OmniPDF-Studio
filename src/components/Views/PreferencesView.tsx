import React, { useState, useEffect } from 'react';
import { Settings, Key, Globe, Download, RefreshCw, CheckCircle2, Shield, Folder, HardDrive, Cpu, AlertCircle, Bot, Server, Loader2, Sparkles } from 'lucide-react';
import { AppPreferences, AIProviderType } from '../../types';
import { AIService } from '../../services/aiService';

interface PreferencesViewProps {
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
}

export const PreferencesView: React.FC<PreferencesViewProps> = ({ onShowMessage }) => {
  const [aiProvider, setAiProvider] = useState<AIProviderType>(() => (localStorage.getItem('omnipdf_ai_provider') as AIProviderType) || 'gemini');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('omnipdf_gemini_api_key') || '');
  const [ollamaUrl, setOllamaUrl] = useState(() => localStorage.getItem('omnipdf_ollama_url') || 'http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState(() => localStorage.getItem('omnipdf_ollama_model') || 'llama3');
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string } | null>(null);

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
    localStorage.setItem('omnipdf_ai_provider', aiProvider);
    localStorage.setItem('omnipdf_gemini_api_key', apiKey.trim());
    localStorage.setItem('omnipdf_ollama_url', ollamaUrl.trim());
    localStorage.setItem('omnipdf_ollama_model', ollamaModel.trim());
    localStorage.setItem('omnipdf_ocr_lang', ocrLang);
    localStorage.setItem('omnipdf_compression', compression);
    localStorage.setItem('omnipdf_auto_update', autoUpdate ? 'true' : 'false');
    onShowMessage('Configurações salvas com sucesso!', 'success');
  };

  const handleTestAi = async () => {
    setIsTestingAi(true);
    setAiTestResult(null);
    // Temporarily save to test
    localStorage.setItem('omnipdf_ai_provider', aiProvider);
    localStorage.setItem('omnipdf_gemini_api_key', apiKey.trim());
    localStorage.setItem('omnipdf_ollama_url', ollamaUrl.trim());
    localStorage.setItem('omnipdf_ollama_model', ollamaModel.trim());

    try {
      const res = await AIService.testConnection();
      setAiTestResult(res);
      if (res.success) {
        onShowMessage(res.message, 'success');
      } else {
        onShowMessage(res.message, 'error');
      }
    } catch (err: any) {
      setAiTestResult({ success: false, message: err.message || 'Erro no teste.' });
    } finally {
      setIsTestingAi(false);
    }
  };

  const handleCheckUpdate = async () => {
    if (!window.electronAPI?.checkForUpdates) {
      onShowMessage('Verificação disponível apenas no aplicativo desktop instalado.', 'error');
      return;
    }

    setIsCheckingUpdate(true);
    setUpdateStatus('Consultando as releases oficiais no GitHub...');

    try {
      const res = await window.electronAPI.checkForUpdates();
      if (res?.status === 'dev-mode') {
        setUpdateStatus('Modo de desenvolvimento: atualizações ativas nos pacotes de produção.');
        onShowMessage('Modo dev ativo. Para testar auto-update, execute o instalador instalado.', 'success');
      } else if (res?.updateInfo) {
        setUpdateStatus(`Nova versão ${res.updateInfo.version} disponível para download!`);
        onShowMessage(`Nova versão ${res.updateInfo.version} encontrada!`, 'success');
      } else {
        setUpdateStatus('OmniPDF Studio já está na versão mais recente (v1.0.0).');
        onShowMessage('Você está na versão mais recente!', 'success');
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
            Personalize provedores de inteligência artificial, LLMs locais, OCR e atualizações automáticas
          </p>
        </div>

        {/* Section 1: AI Engine & Local LLMs */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-200">Motor de Inteligência Artificial & LLMs</h2>
                <p className="text-xs text-slate-400">Escolha entre API na nuvem (Gemini) ou LLM local baixada no seu PC (Ollama)</p>
              </div>
            </div>

            <button
              onClick={handleTestAi}
              disabled={isTestingAi}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isTestingAi ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Testar Conexão
                </>
              )}
            </button>
          </div>

          {/* Provider selector tabs */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setAiProvider('gemini')}
              className={`p-4 rounded-xl border text-left transition-all ${
                aiProvider === 'gemini'
                  ? 'border-purple-500 bg-purple-950/30 text-white shadow-sm'
                  : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold">Google Gemini 2.5 Flash</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Mais rápido e preciso via chave API gratuita do Google AI Studio.
              </p>
            </button>

            <button
              onClick={() => setAiProvider('ollama')}
              className={`p-4 rounded-xl border text-left transition-all ${
                aiProvider === 'ollama'
                  ? 'border-cyan-500 bg-cyan-950/30 text-white shadow-sm'
                  : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Server className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold">LLM Local no PC (Ollama / LM Studio)</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                100% privado offline. Modelos locais: Llama 3, Mistral, Qwen, DeepSeek.
              </p>
            </button>
          </div>

          {/* Conditional inputs */}
          {aiProvider === 'gemini' && (
            <div className="space-y-2 p-4 bg-slate-950 rounded-xl border border-slate-800">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Chave de API do Gemini (AI Studio)</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-purple-400 hover:underline"
                >
                  Obter chave grátis →
                </a>
              </label>
              <input
                type="password"
                placeholder="Cole sua API Key (AIzaSy...)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-purple-500"
              />
              <p className="text-[11px] text-slate-500">
                🔒 A chave fica gravada no armazenamento criptografado local do seu computador.
              </p>
            </div>
          )}

          {aiProvider === 'ollama' && (
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-950 rounded-xl border border-slate-800">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Endpoint do Ollama</label>
                <input
                  type="text"
                  placeholder="http://localhost:11434"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300">Nome do Modelo Local</label>
                <input
                  type="text"
                  placeholder="llama3, mistral, deepseek-r1"
                  value={ollamaModel}
                  onChange={(e) => setOllamaModel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <p className="col-span-2 text-[11px] text-slate-500">
                💡 Requer o Ollama instalado no Windows (<code className="text-cyan-400">ollama run llama3</code>). As inferências ocorrem na sua GPU/CPU local sem enviar nenhum byte para a internet.
              </p>
            </div>
          )}

          {aiTestResult && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
              aiTestResult.success 
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}>
              {aiTestResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{aiTestResult.message}</span>
            </div>
          )}
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
                <h2 className="text-sm font-bold text-slate-200">Atualizações Automáticas do Aplicativo</h2>
                <p className="text-xs text-slate-400">Versão instalada: <span className="font-mono text-slate-200 font-semibold">v{appVersion}</span></p>
              </div>
            </div>

            <button
              onClick={handleCheckUpdate}
              disabled={isCheckingUpdate}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              {isCheckingUpdate ? 'Consultando...' : 'Verificar Atualização'}
            </button>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-300">Checar atualizações automaticamente ao iniciar o OmniPDF</span>
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
