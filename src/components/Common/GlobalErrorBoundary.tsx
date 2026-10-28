import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
  onResetToHome?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    copied: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, copied: false };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('OmniPDF Studio - Uncaught Error in Component Tree:', error, errorInfo);
  }

  private handleCopyError = () => {
    if (!this.state.error) return;
    const details = `OmniPDF Studio Error Report:\nError: ${this.state.error.message}\nStack:\n${this.state.error.stack}`;
    navigator.clipboard.writeText(details);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, copied: false });
    if (this.props.onResetToHome) {
      this.props.onResetToHome();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] h-full p-8 bg-[#12141a] text-slate-100 select-none animate-in fade-in">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-lg font-bold text-white">
                Ocorreu uma falha inesperada na visualização
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Um erro imprevisto impediu a renderização deste componente. Seus arquivos locais originais não foram afetados.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-left overflow-x-auto max-h-36">
                <code className="text-[11px] font-mono text-rose-300 break-words">
                  {this.state.error.message || 'Erro desconhecido'}
                </code>
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-rose-600/25 transition-all flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Voltar ao Início
              </button>

              <button
                type="button"
                onClick={this.handleCopyError}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center gap-2"
              >
                {this.state.copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Diagnóstico</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
