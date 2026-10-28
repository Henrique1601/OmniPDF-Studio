import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

interface ToolLoadingFallbackProps {
  toolName?: string;
}

export const ToolLoadingFallback: React.FC<ToolLoadingFallbackProps> = ({ toolName }) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full bg-[#12141a] p-8 select-none animate-in fade-in duration-150">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center">
        <div className="relative">
          <div className="w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <Sparkles className="w-4 h-4 text-rose-400 absolute -top-1 -right-1 animate-pulse" />
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-200">
            {toolName ? `Carregando ${toolName}...` : 'Carregando Ferramenta...'}
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Inicializando ambiente offline de alta performance
          </p>
        </div>

        <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-gradient-to-r from-brand-500 to-rose-500 rounded-full animate-[shimmer_1.5s_infinite]" />
        </div>
      </div>
    </div>
  );
};
