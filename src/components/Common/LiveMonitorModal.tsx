import React from 'react';
import { Activity, Terminal, CheckCircle2, Loader2, Clock, Cpu, FileText } from 'lucide-react';

export interface LiveLogEvent {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warn' | 'active';
  page?: number;
}

interface LiveMonitorModalProps {
  isOpen: boolean;
  title: string;
  currentStep: string;
  progress: number;
  elapsedSeconds: number;
  logs: LiveLogEvent[];
  previewCanvasRef?: React.RefObject<HTMLCanvasElement>;
  currentPage?: number;
  totalPages?: number;
}

export const LiveMonitorModal: React.FC<LiveMonitorModalProps> = ({
  isOpen,
  title,
  currentStep,
  progress,
  elapsedSeconds,
  logs,
  previewCanvasRef,
  currentPage,
  totalPages,
}) => {
  if (!isOpen) return null;

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md select-none animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0e1117] border border-cyan-500/30 rounded-3xl shadow-2xl shadow-cyan-950/40 overflow-hidden text-slate-100 space-y-4 p-6">
        {/* Header with live pulsing badge */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">{title}</h3>
                <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/40 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                  LIVE STREAM
                </span>
              </div>
              <p className="text-xs text-slate-400">{currentStep}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              {formatTime(elapsedSeconds)}
            </span>
            {totalPages && (
              <span className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                Pág. {currentPage || 1}/{totalPages}
              </span>
            )}
          </div>
        </div>

        {/* Live Canvas Preview if available */}
        {previewCanvasRef && (
          <div className="flex justify-center bg-black/60 p-3 rounded-2xl border border-slate-800 max-h-48 overflow-hidden">
            <canvas ref={previewCanvasRef} className="max-h-44 object-contain rounded-lg shadow-md" />
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              Execução em Tempo Real...
            </span>
            <span className="font-mono text-cyan-400 font-bold">{Math.round(progress)}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Live Console Event Logs */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1 font-semibold text-slate-300">
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              Terminal de Eventos Internos
            </span>
            <span>{logs.length} eventos registrados</span>
          </div>

          <div className="p-3 bg-black/75 rounded-2xl border border-slate-800/80 font-mono text-[11px] h-36 overflow-y-auto space-y-1.5 select-text">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                <span
                  className={
                    log.type === 'success'
                      ? 'text-emerald-400'
                      : log.type === 'warn'
                      ? 'text-amber-400'
                      : log.type === 'active'
                      ? 'text-cyan-300 font-semibold'
                      : 'text-slate-300'
                  }
                >
                  {log.type === 'active' && '▶ '}
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
