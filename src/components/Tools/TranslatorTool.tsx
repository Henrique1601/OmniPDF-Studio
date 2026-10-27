import React, { useState, useEffect } from 'react';
import { Languages, Loader2, Download, ArrowRight, Sparkles, CheckCircle2, Globe, FileText, RefreshCw } from 'lucide-react';
import { PDFFileInfo, DetectedTextItem, TextEditItem } from '../../types';
import { PDFService } from '../../services/pdfService';
import { AIService } from '../../services/aiService';
import { LiveMonitorModal, LiveLogEvent } from '../Common/LiveMonitorModal';

interface TranslatorToolProps {
  currentFile: PDFFileInfo | null;
  onOpenFile: () => void;
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
  onFileUpdated?: (newFile: PDFFileInfo) => void;
}

export const TranslatorTool: React.FC<TranslatorToolProps> = ({
  currentFile,
  onOpenFile,
  onShowMessage,
  onFileUpdated
}) => {
  const [targetLang, setTargetLang] = useState<'pt' | 'en' | 'es' | 'fr' | 'de'>('pt');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isTranslating, setIsTranslating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('omnipdf_gemini_api_key') || '');
  const [translatedPdfBytes, setTranslatedPdfBytes] = useState<Uint8Array | null>(null);
  const [translatedSummary, setTranslatedSummary] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<string>('');
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [liveLogs, setLiveLogs] = useState<LiveLogEvent[]>([]);

  useEffect(() => {
    if (currentFile) {
      PDFService.getPageCount(currentFile.data).then(count => {
        setTotalPages(count);
        setCurrentPage(1);
      });
    }
  }, [currentFile]);

  const targetLangNames: Record<string, string> = {
    pt: 'Português',
    en: 'Inglês',
    es: 'Espanhol',
    fr: 'Francês',
    de: 'Alemão'
  };

  const offlineTranslate = (text: string, target: string): string => {
    // High-frequency glossary translation dictionary
    const dictionary: Record<string, Record<string, string>> = {
      pt: {
        'invoice': 'Fatura',
        'contract': 'Contrato',
        'agreement': 'Acordo',
        'payment': 'Pagamento',
        'date': 'Data',
        'signature': 'Assinatura',
        'terms and conditions': 'Termos e Condições',
        'total amount': 'Valor Total',
        'due date': 'Data de Vencimento',
        'company': 'Empresa',
        'client': 'Cliente',
        'service': 'Serviço',
        'summary': 'Resumo',
        'description': 'Descrição',
        'confidential': 'Confidencial',
        'page': 'Página',
        'report': 'Relatório',
        'privacy policy': 'Política de Privacidade',
        'statement of work': 'Declaração de Trabalho',
      },
      en: {
        'fatura': 'Invoice',
        'contrato': 'Contract',
        'acordo': 'Agreement',
        'pagamento': 'Payment',
        'data': 'Date',
        'assinatura': 'Signature',
        'termos e condições': 'Terms and Conditions',
        'valor total': 'Total Amount',
        'data de vencimento': 'Due Date',
        'empresa': 'Company',
        'cliente': 'Client',
        'serviço': 'Service',
        'resumo': 'Summary',
        'descrição': 'Description',
        'confidencial': 'Confidential',
        'página': 'Page',
        'relatório': 'Report'
      }
    };

    let result = text;
    const dict = dictionary[target];
    if (dict) {
      Object.entries(dict).forEach(([src, trg]) => {
        const regex = new RegExp(`\\b${src}\\b`, 'gi');
        result = result.replace(regex, trg);
      });
    }
    return result;
  };

  const addLiveLog = (message: string, type: 'info' | 'success' | 'warn' | 'active' = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLiveLogs(prev => [...prev.slice(-30), {
      id: Math.random().toString(),
      timestamp: time,
      message,
      type
    }]);
  };

  const handleTranslateAll = async () => {
    if (!currentFile) return;
    setIsTranslating(true);
    setProgress(0);
    setElapsedSeconds(0);
    setLiveLogs([]);

    const timer = setInterval(() => {
      setElapsedSeconds(s => Number((s + 0.1).toFixed(1)));
    }, 100);

    addLiveLog(`Iniciando tradução para [${targetLangNames[targetLang]}]`, 'active');

    try {
      const allEdits: TextEditItem[] = [];

      for (let p = 1; p <= totalPages; p++) {
        setCurrentStep(`Traduzindo página ${p} de ${totalPages}...`);
        addLiveLog(`Página ${p}/${totalPages}: Extraindo posições de texto...`, 'active');
        const textItems = await PDFService.extractPageTextItems(currentFile.data, p, 1.0);
        if (textItems.length === 0) continue;

        // Group text by chunks to translate with AI or offline
        const textsToTranslate = textItems.map(item => item.str);
        let translatedTexts: string[] = [];

        if (AIService.hasConfiguredAI()) {
          try {
            addLiveLog(`Página ${p}: Consultando modelo de IA...`);
            const prompt = `Translate the following array of strings into ${targetLangNames[targetLang]}. Keep formatting, numbers, and layout codes identical. Output ONLY a valid JSON array of strings in the exact same index order:\n${JSON.stringify(textsToTranslate)}`;
            const textResponse = await AIService.generate(prompt);
            const jsonMatch = textResponse.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              translatedTexts = JSON.parse(jsonMatch[0]);
              addLiveLog(`Página ${p}: ${translatedTexts.length} bloco(s) traduzidos via IA.`, 'success');
            }
          } catch (apiErr) {
            addLiveLog(`Falha no modelo de IA, usando glossário local: ${apiErr}`, 'warn');
          }
        }

        // Fallback if AI not used or failed
        if (translatedTexts.length !== textItems.length) {
          translatedTexts = textItems.map(item => offlineTranslate(item.str, targetLang));
        }

        // Create in-place text replacement edits
        textItems.forEach((item, idx) => {
          const newText = translatedTexts[idx] || item.str;
          if (newText !== item.str) {
            allEdits.push({
              id: `trans-${p}-${idx}`,
              pageNumber: p,
              pdfX: item.pdfX,
              pdfY: item.pdfY,
              pdfWidth: item.pdfWidth,
              pdfHeight: item.pdfHeight,
              originalText: item.str,
              newText: newText,
              fontSize: item.fontSize,
              bgColor: { r: 1, g: 1, b: 1 },
              textColor: { r: 0.1, g: 0.1, b: 0.1 }
            });
          }
        });

        setProgress(Math.round((p / totalPages) * 100));
      }

      addLiveLog(`Gravando ${allEdits.length} substituições no PDF final...`, 'active');
      const result = await PDFService.applyTextEdits(currentFile.data, allEdits);
      setTranslatedPdfBytes(result);
      setTranslatedSummary(`Tradução concluída! ${allEdits.length} blocos de texto foram substituídos nas posições nativas.`);
      addLiveLog(`Tradução completa com sucesso!`, 'success');
      onShowMessage('Documento traduzido com sucesso preservando o layout!', 'success');

      if (onFileUpdated) {
        onFileUpdated({
          ...currentFile,
          data: result.buffer as ArrayBuffer,
          name: `Traduzido_${targetLang.toUpperCase()}_${currentFile.name}`
        });
      }
    } catch (err: any) {
      console.error(err);
      addLiveLog(`Erro: ${err.message}`, 'warn');
      onShowMessage(`Erro na tradução: ${err.message}`, 'error');
    } finally {
      clearInterval(timer);
      setTimeout(() => {
        setIsTranslating(false);
      }, 700);
    }
  };

  const handleSave = async () => {
    if (!translatedPdfBytes || !currentFile) return;
    const filename = `Traduzido_${targetLang.toUpperCase()}_${currentFile.name}`;

    if (window.electronAPI?.saveFileDialog && window.electronAPI?.writeFile) {
      const savePath = await window.electronAPI.saveFileDialog({
        defaultPath: filename,
        filters: [{ name: 'Documento PDF', extensions: ['pdf'] }]
      });
      if (savePath) {
        await window.electronAPI.writeFile(savePath, translatedPdfBytes.buffer as ArrayBuffer);
        onShowMessage('PDF traduzido salvo com sucesso!', 'success');
      }
    } else {
      const blob = PDFService.createBlob(translatedPdfBytes);
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
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
          <Languages className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Tradutor Integral de PDF</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          Traduza documentos preservando a paginação original, caixas de texto e coordenadas visuais.
        </p>
        <button
          onClick={onOpenFile}
          className="px-6 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-500/20 transition-all"
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Languages className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Tradutor Integral de PDF
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-500/40">
                Layout Seguro
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Arquivo: <span className="text-slate-200 font-medium">{currentFile.name}</span> ({totalPages} páginas)
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

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden p-8 gap-8 items-center justify-center">
        <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-100">Preservação Arquitetural de Layout</h3>
              <p className="text-xs text-slate-400 mt-1">
                Ao contrário de ferramentas online que quebram o documento em texto simples, o OmniPDF Studio sobrepõe a tradução nas coordenadas exatas de cada bloco de texto do PDF original.
              </p>
            </div>
          </div>

          {/* Language Selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">Idioma de Destino</label>
            <div className="grid grid-cols-5 gap-2">
              {(['pt', 'en', 'es', 'fr', 'de'] as const).map(lang => (
                <button
                  key={lang}
                  onClick={() => setTargetLang(lang)}
                  className={`p-3 rounded-xl border text-center text-xs transition-all ${
                    targetLang === lang
                      ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300 font-bold'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {targetLangNames[lang]}
                </button>
              ))}
            </div>
          </div>

          {/* Gemini API Key Box (Optional) */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Motor de IA (Gemini 2.5 Flash)
              </span>
              <span className="text-[10px] text-slate-500">Opcional para tradução contextual profunda</span>
            </div>
            <input
              type="password"
              placeholder="Cole sua Gemini API Key (ou deixe vazio para motor offline)..."
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                localStorage.setItem('omnipdf_gemini_api_key', e.target.value);
              }}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-700 bg-slate-900 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Status / Summary */}
          {translatedSummary && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-300 text-xs">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <span>{translatedSummary}</span>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
            <div className="text-xs text-slate-400">
              {isTranslating ? `Traduzindo documento... ${progress}%` : `${totalPages} páginas prontas para traduzir`}
            </div>

            <div className="flex items-center gap-2">
              {!translatedPdfBytes ? (
                <button
                  onClick={handleTranslateAll}
                  disabled={isTranslating}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium text-xs rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isTranslating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processando ({progress}%)...
                    </>
                  ) : (
                    <>
                      <Languages className="w-4 h-4" />
                      Iniciar Tradução Integral
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Salvar PDF Traduzido
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <LiveMonitorModal
        isOpen={isTranslating}
        title="Tradutor Integral de PDF"
        currentStep={currentStep}
        progress={progress}
        elapsedSeconds={elapsedSeconds}
        logs={liveLogs}
        totalPages={totalPages}
      />
    </div>
  );
};
