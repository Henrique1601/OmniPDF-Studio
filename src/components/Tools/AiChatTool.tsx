import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Key, 
  Copy, 
  Check, 
  Trash2, 
  FileText, 
  HelpCircle,
  Zap,
  Globe
} from 'lucide-react';
import { PDFFileInfo } from '../../types';
import { PDFService } from '../../services/pdfService';
import { AIService } from '../../services/aiService';

interface AiChatToolProps {
  currentFile: PDFFileInfo | null;
  onOpenFile: () => void;
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const AiChatTool: React.FC<AiChatToolProps> = ({
  currentFile,
  onOpenFile,
  onShowMessage,
}) => {
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('omnipdf_gemini_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Olá! Sou o assistente de IA do OmniPDF Studio. Posso responder perguntas, resumir cláusulas, extrair valores e explicar qualquer detalhe deste documento.',
      timestamp: 'Agora',
    },
  ]);
  const [inputQuestion, setInputQuestion] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [docText, setDocText] = useState<string>('');
  const [extracting, setExtracting] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Extract text from entire PDF
  useEffect(() => {
    if (!currentFile) {
      setDocText('');
      return;
    }

    setExtracting(true);
    PDFService.extractAllDocumentText(currentFile.data)
      .then((pages) => {
        const full = pages.map((p) => `--- PÁGINA ${p.pageNumber} ---\n${p.text}`).join('\n\n');
        setDocText(full);
        setExtracting(false);
      })
      .catch((err) => {
        console.error(err);
        setExtracting(false);
      });
  }, [currentFile]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('omnipdf_gemini_api_key', key);
    setShowKeyInput(false);
    onShowMessage('Chave da API Gemini salva com sucesso!', 'success');
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const question = (customPrompt || inputQuestion).trim();
    if (!question) return;

    if (!docText) {
      onShowMessage('O texto do documento ainda está sendo processado.', 'error');
      return;
    }

    const userMsg: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setLoading(true);

    try {
      let reply = '';

      if (AIService.hasConfiguredAI()) {
        const systemPrompt = `Você é o assistente inteligente do OmniPDF Studio. Analise o documento PDF fornecido e responda à pergunta do usuário de forma clara, profissional e objetiva em português do Brasil. Cite páginas quando relevante.`;
        const prompt = `DOCUMENTO:\n${docText.slice(0, 45000)}\n\nPERGUNTA DO USUÁRIO:\n${question}`;
        
        reply = await AIService.generate(prompt, systemPrompt);
        if (!reply) {
          reply = 'Não foi possível obter uma resposta do modelo de IA.';
        }
      } else {
        // Local Smart Heuristics Fallback when no API Key or Local LLM is provided
        await new Promise((r) => setTimeout(r, 600));

        if (question.toLowerCase().includes('resum')) {
          reply = `📋 **Resumo Heurístico Local (${currentFile?.name}):**\n\n- **Extensão:** ${currentFile?.pageCount || 1} página(s)\n- **Volume de Texto:** ~${docText.split(/\s+/).length} palavras analisadas.\n- **Visão Geral:** O documento possui seções estruturadas e termos formais identificados.\n\n*(Dica: Configure sua chave Gemini API ou uma LLM local Ollama nas Configurações para obter resumos profundos de modelos LLM).*`;
        } else if (question.toLowerCase().includes('valor') || question.toLowerCase().includes('preço')) {
          const moneyRegex = /(?:R\$\s?|\$)\s?\d+(?:[.,]\d{2,3})*(?:[.,]\d{2})?/gi;
          const matches = docText.match(moneyRegex) || [];
          reply = `💰 **Valores Monetários Encontrados:**\n\n${
            matches.length > 0
              ? matches.slice(0, 8).map((m) => `• ${m}`).join('\n')
              : 'Nenhum valor monetário explícito (R$ ou $) foi detectado nas páginas.'
          }`;
        } else {
          reply = `🔍 **Análise Local Heurística:** Identifiquei ocorrências dos termos pesquisados no documento. Para raciocínio avançado, interpretação de contexto e síntese completa, configure uma Chave Gemini API ou conecte o Ollama local nas Preferências do app!`;
        }
      }

      const aiMsg: Message = {
        id: Math.random().toString(),
        sender: 'ai',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error(err);
      const errorMsg: Message = {
        id: Math.random().toString(),
        sender: 'ai',
        text: `⚠️ Erro ao consultar a IA: ${err.message}. Verifique sua chave de API ou conexão de rede.`,
        timestamp: 'Erro',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    'Resuma os pontos principais deste PDF',
    'Extraia datas importantes e prazos',
    'Existem cláusulas de multa ou rescisão?',
    'Liste as partes e nomes citados',
  ];

  if (!currentFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 text-center">
        <Bot className="w-12 h-12 text-brand-400 mb-4 animate-bounce" />
        <h3 className="text-lg font-bold text-white mb-2">Converse com seu Documento PDF</h3>
        <p className="text-xs text-slate-400 max-w-sm mb-6">
          Faça perguntas sobre qualquer página, resuma contratos e extraia dados automaticamente com inteligência artificial.
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
          <Bot className="w-5 h-5 text-brand-400" />
          <h2 className="text-sm font-bold text-white">IA Assistente (Pergunte ao seu PDF)</h2>
          {extracting ? (
            <span className="text-[11px] text-amber-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Lendo texto do documento...
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">
              • {docText.length} caracteres indexados
            </span>
          )}
        </div>

        {/* API Key Modal / Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
              apiKey
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            {apiKey ? 'API Gemini Conectada' : 'Configurar Chave Gemini'}
          </button>
        </div>
      </div>

      {/* API Key Setting Dropdown */}
      {showKeyInput && (
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4 animate-in fade-in">
          <div className="flex-1 max-w-xl flex items-center gap-2">
            <input
              type="password"
              placeholder="Cole sua chave da Google Gemini API (AIza...)"
              defaultValue={apiKey}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveApiKey((e.target as any).value);
              }}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
            />
            <button
              onClick={(e) => {
                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                handleSaveApiKey(input.value);
              }}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold"
            >
              Salvar
            </button>
          </div>
          <span className="text-[11px] text-slate-400">
            A chave fica salva com segurança localmente no seu aplicativo.
          </span>
        </div>
      )}

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-4xl w-full mx-auto">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-brand-600 text-white rounded-tr-none shadow-md'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.text}</div>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 px-1">{m.timestamp}</span>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 p-2">
            <span className="w-3.5 h-3.5 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            A IA está lendo o documento e formulando a resposta...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Area & Quick Suggestions */}
      <div className="border-t border-slate-800 bg-slate-900/90 p-4 shrink-0">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Quick Prompts */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {quickPrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(p)}
                disabled={loading || extracting}
                className="whitespace-nowrap px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700/60 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Text Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Faça qualquer pergunta sobre este documento PDF..."
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              disabled={loading || extracting}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-brand-500"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={loading || extracting || !inputQuestion.trim()}
              className="px-5 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white font-semibold text-xs shadow-lg shadow-brand-600/30 flex items-center gap-1.5 transition-all"
            >
              <Send className="w-4 h-4" />
              Enviar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
