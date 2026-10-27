import React, { useState } from 'react';
import { ShieldAlert, FileText, AlertTriangle, CheckCircle2, Loader2, Sparkles, Download, Copy, BookmarkCheck, Scale } from 'lucide-react';
import { PDFFileInfo } from '../../types';
import { PDFService } from '../../services/pdfService';
import { AIService } from '../../services/aiService';

interface ContractAuditToolProps {
  currentFile: PDFFileInfo | null;
  onOpenFile: () => void;
  onShowMessage: (msg: string, type?: 'success' | 'error') => void;
}

interface AuditReport {
  title: string;
  parties: string[];
  duration: string;
  financials: string[];
  penalties: string[];
  risks: { level: 'low' | 'medium' | 'high'; description: string }[];
  overallRiskScore: 'Baixo' | 'Médio' | 'Alto';
  recommendations: string[];
}

export const ContractAuditTool: React.FC<ContractAuditToolProps> = ({
  currentFile,
  onOpenFile,
  onShowMessage
}) => {
  const [isAuditing, setIsAuditing] = useState(false);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('omnipdf_gemini_api_key') || '');

  const runAudit = async () => {
    if (!currentFile) return;
    setIsAuditing(true);

    try {
      const pageTexts = await PDFService.extractAllDocumentText(currentFile.data);
      const fullText = pageTexts.map(p => `[Página ${p.pageNumber}]\n${p.text}`).join('\n\n');

      let generatedReport: AuditReport;

      if (AIService.hasConfiguredAI()) {
        try {
          const prompt = `Você é um auditor jurídico sênior especializado em contratos. Analise o seguinte contrato extraído de um PDF e retorne uma auditoria estrita em formato JSON com o seguinte schema:
{
  "title": "Tipo do Contrato ou Título",
  "parties": ["Contratante: ...", "Contratada: ..."],
  "duration": "Resumo do prazo de vigência e regras de renovação",
  "financials": ["Valor total: ...", "Condições de pagamento: ..."],
  "penalties": ["Multas rescisórias: ...", "Penalidades por inadimplência: ..."],
  "risks": [
    { "level": "high" | "medium" | "low", "description": "Descrição clara do risco identificado" }
  ],
  "overallRiskScore": "Baixo" | "Médio" | "Alto",
  "recommendations": ["Recomendação 1...", "Recomendação 2..."]
}

Contrato:\n${fullText.slice(0, 35000)}`;

          const jsonText = await AIService.generate(prompt);
          const match = jsonText.match(/\{[\s\S]*\}/);
          if (match) {
            generatedReport = JSON.parse(match[0]);
          } else {
            throw new Error('Falha no parsing JSON da IA');
          }
        } catch (aiErr) {
          console.warn('AI error, falling back to heuristic engine', aiErr);
          generatedReport = runHeuristicAudit(fullText);
        }
      } else {
        generatedReport = runHeuristicAudit(fullText);
      }

      setReport(generatedReport);
      onShowMessage('Auditoria de contrato concluída com sucesso!', 'success');
    } catch (err: any) {
      console.error(err);
      onShowMessage(`Erro ao auditar contrato: ${err.message}`, 'error');
    } finally {
      setIsAuditing(false);
    }
  };

  const runHeuristicAudit = (text: string): AuditReport => {
    const hasRenewal = /renova(ção|ra)?\s+automática/i.test(text);
    const hasPenalty = /multa|penalidade|inadimpl/i.test(text);
    const hasRescission = /rescis(ão|ao)|resil/i.test(text);
    const hasMonetary = /r\$\s*[\d\.,]+/i.test(text);

    const values = text.match(/r\$\s*[\d\.,]+/gi) || ['Valores não identificados automaticamente'];
    const risks: { level: 'low' | 'medium' | 'high'; description: string }[] = [];

    if (hasRenewal) {
      risks.push({
        level: 'medium',
        description: 'Cláusula de Renovação Automática detectada. Verifique o prazo de notificação prévia para evitar cobranças indesejadas.'
      });
    }

    if (!hasRescission) {
      risks.push({
        level: 'high',
        description: 'Condições de rescisão imotivada não claramente especificadas no texto detectado.'
      });
    }

    if (hasPenalty) {
      risks.push({
        level: 'low',
        description: 'Cláusulas penais identificadas. Recomenda-se auditar se a retenção não excede o limite legal.'
      });
    }

    return {
      title: 'Auditoria Heurística de Contrato & Instrumento Particular',
      parties: [
        'Partes contratantes identificadas no preâmbulo do documento',
      ],
      duration: hasRenewal ? 'Prazo com renovação automática' : 'Prazo determinado padrão',
      financials: Array.from(new Set(values)).slice(0, 4),
      penalties: hasPenalty 
        ? ['Multas por mora/atraso e rescisão contratual estipuladas']
        : ['Nenhuma menção explícita a multas pesadas detectada'],
      risks: risks.length > 0 ? risks : [{ level: 'low', description: 'Nenhum risco grave de bloqueio identificado.' }],
      overallRiskScore: risks.some(r => r.level === 'high') ? 'Alto' : risks.some(r => r.level === 'medium') ? 'Médio' : 'Baixo',
      recommendations: [
        'Verifique os prazos de aviso prévio e foro eleito.',
        'Confira se todas as assinaturas dos representantes legais possuem certidão de poderes.',
        'Ative uma chave Gemini API nas configurações para uma análise cláusula a cláusula.'
      ]
    };
  };

  const exportReport = () => {
    if (!report) return;
    const content = `# Relatório de Auditoria de Contrato
Documento: ${currentFile?.name || 'Contrato'}
Classificação de Risco: ${report.overallRiskScore}

## 1. Partes Identificadas
${report.parties.map(p => `- ${p}`).join('\n')}

## 2. Vigência e Prazos
${report.duration}

## 3. Cláusulas Financeiras
${report.financials.map(f => `- ${f}`).join('\n')}

## 4. Penalidades e Rescisão
${report.penalties.map(p => `- ${p}`).join('\n')}

## 5. Riscos Mapeados
${report.risks.map(r => `- [${r.level.toUpperCase()}] ${r.description}`).join('\n')}

## 6. Recomendações
${report.recommendations.map(rc => `- ${rc}`).join('\n')}
`;

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Auditoria_${currentFile?.name.replace('.pdf', '') || 'Contrato'}.md`;
    a.click();
    URL.revokeObjectURL(url);
    onShowMessage('Relatório de auditoria exportado em Markdown!', 'success');
  };

  if (!currentFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
          <Scale className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-100 mb-2">Auditor Automático de Contratos</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          Faça uma auditoria de conformidade, cláusulas abusivas, prazos, renovações automáticas e multas rescisórias.
        </p>
        <button
          onClick={onOpenFile}
          className="px-6 py-2.5 bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-600 hover:to-amber-700 text-white font-medium text-sm rounded-xl shadow-lg shadow-rose-500/20 transition-all"
        >
          Selecionar Contrato PDF
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden text-slate-100">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              Auditor de Contratos & Riscos
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-900/60 text-rose-300 border border-rose-500/40">
                Jurídico
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              Arquivo: <span className="text-slate-200 font-medium">{currentFile.name}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenFile}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
          >
            Trocar Arquivo
          </button>
          {!report ? (
            <button
              onClick={runAudit}
              disabled={isAuditing}
              className="px-4 py-2 bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-600 hover:to-amber-700 text-white rounded-lg text-xs font-medium shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {isAuditing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Auditando Cláusulas...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Executar Auditoria
                </>
              )}
            </button>
          ) : (
            <button
              onClick={exportReport}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium shadow-sm transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar Relatório (.md)
            </button>
          )}
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-6">
        {!report && !isAuditing && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-800 rounded-2xl max-w-2xl mx-auto my-12">
            <Scale className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-base font-semibold text-slate-200 mb-2">Pronto para Auditar</h3>
            <p className="text-xs text-slate-400 max-w-md mb-6">
              O motor examinará todo o teor do contrato à procura de cláusulas de vigência, penalidades, retenções financeiras, renovação automática e foro.
            </p>
            <button
              onClick={runAudit}
              className="px-6 py-2.5 bg-gradient-to-r from-rose-500 to-amber-600 hover:from-rose-600 hover:to-amber-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-500/20 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Iniciar Análise Jurídica
            </button>
          </div>
        )}

        {isAuditing && (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center">
            <Loader2 className="w-10 h-10 text-rose-500 animate-spin mb-4" />
            <h3 className="text-sm font-semibold text-slate-200 mb-1">Processando conteúdo do contrato...</h3>
            <p className="text-xs text-slate-400">Classificando cláusulas e calculando score de risco.</p>
          </div>
        )}

        {report && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Top Score Banner */}
            <div className={`p-5 rounded-2xl border flex items-center justify-between ${
              report.overallRiskScore === 'Alto'
                ? 'bg-rose-950/40 border-rose-500/40'
                : report.overallRiskScore === 'Médio'
                ? 'bg-amber-950/40 border-amber-500/40'
                : 'bg-emerald-950/40 border-emerald-500/40'
            }`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${
                  report.overallRiskScore === 'Alto' ? 'bg-rose-600' : report.overallRiskScore === 'Médio' ? 'bg-amber-600' : 'bg-emerald-600'
                }`}>
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-100">{report.title}</h2>
                  <p className="text-xs text-slate-400">Classificação Geral de Risco Jurídico</p>
                </div>
              </div>

              <div className={`text-sm font-bold px-4 py-1.5 rounded-xl border uppercase tracking-wider ${
                report.overallRiskScore === 'Alto'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : report.overallRiskScore === 'Médio'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                Score: {report.overallRiskScore}
              </div>
            </div>

            {/* Grid with Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <BookmarkCheck className="w-4 h-4 text-rose-400" />
                  Vigência & Prazos
                </h3>
                <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {report.duration}
                </p>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                  Valores & Pagamentos
                </h3>
                <ul className="text-xs text-slate-300 space-y-1">
                  {report.financials.map((f, i) => (
                    <li key={i} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 truncate">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Penalties & Risks */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                Pontos de Atenção & Riscos Identificados ({report.risks.length})
              </h3>
              <div className="space-y-2">
                {report.risks.map((r, i) => (
                  <div
                    key={i}
                    className={`p-3.5 rounded-xl border text-xs flex items-start gap-3 ${
                      r.level === 'high'
                        ? 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                        : r.level === 'medium'
                        ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300'
                    }`}
                  >
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase shrink-0 mt-0.5 ${
                      r.level === 'high' ? 'bg-rose-600 text-white' : r.level === 'medium' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {r.level}
                    </span>
                    <span className="leading-relaxed">{r.description}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                Recomendações Práticas do Auditor
              </h3>
              <ul className="text-xs text-slate-300 space-y-2">
                {report.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
