import React from 'react';
import { History, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { TaskHistoryItem } from '../../types';

interface TaskHistoryViewProps {
  history: TaskHistoryItem[];
  onClearHistory: () => void;
}

export const TaskHistoryView: React.FC<TaskHistoryViewProps> = ({ history, onClearHistory }) => {
  return (
    <div className="flex-1 flex flex-col h-full bg-[#12141a] overflow-y-auto text-slate-100 p-8 select-none">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <History className="w-6 h-6 text-brand-500" />
              Histórico de Tarefas (Tasks History)
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Registro das operações, conversões e processamentos executados no OmniPDF Studio
            </p>
          </div>

          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              className="px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Limpar Tarefas
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-slate-800 rounded-2xl">
            <History className="w-12 h-12 text-slate-600 mb-3" />
            <h3 className="text-sm font-semibold text-slate-300 mb-1">Nenhuma tarefa registrada</h3>
            <p className="text-xs text-slate-500">As operações de compressão, mesclagem e IA aparecerão aqui conforme forem concluídas.</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl divide-y divide-slate-800 overflow-hidden">
            {history.map((t) => (
              <div key={t.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    t.status === 'success' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30' : 'bg-rose-950/40 text-rose-400 border border-rose-500/30'
                  }`}>
                    {t.status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-200">{t.tool} — {t.fileName}</p>
                    <p className="text-[11px] text-slate-500">
                      {new Date(t.timestamp).toLocaleDateString()} às {new Date(t.timestamp).toLocaleTimeString()}
                      {t.details && ` • ${t.details}`}
                    </p>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                  t.status === 'success' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' : 'bg-rose-950 text-rose-400 border-rose-800'
                }`}>
                  {t.status === 'success' ? 'Concluído' : 'Erro'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
