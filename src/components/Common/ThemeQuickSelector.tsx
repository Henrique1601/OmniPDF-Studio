import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Clock, Monitor, Palette, Check, Sparkles } from 'lucide-react';
import { ThemeService, AVAILABLE_THEMES } from '../../services/themeService';
import { ThemeId, ThemeDefinition } from '../../types';

interface ThemeQuickSelectorProps {
  onOpenPreferences?: () => void;
}

export const ThemeQuickSelector: React.FC<ThemeQuickSelectorProps> = ({ onOpenPreferences }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>(() => ThemeService.getSelectedTheme());
  const [effectiveTheme, setEffectiveTheme] = useState<ThemeId>(() => ThemeService.getEffectiveTheme());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = ThemeService.subscribe((eff, sel) => {
      setEffectiveTheme(eff);
      setSelectedTheme(sel);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelectTheme = (themeId: ThemeId) => {
    ThemeService.setSelectedTheme(themeId);
    setIsOpen(false);
  };

  const getThemeIcon = () => {
    if (selectedTheme === 'system') return <Monitor className="w-3.5 h-3.5" />;
    if (selectedTheme === 'scheduled') return <Clock className="w-3.5 h-3.5" />;
    if (effectiveTheme.startsWith('light')) return <Sun className="w-3.5 h-3.5" />;
    return <Moon className="w-3.5 h-3.5" />;
  };

  const darkThemes = AVAILABLE_THEMES.filter(t => t.category === 'dark');
  const lightThemes = AVAILABLE_THEMES.filter(t => t.category === 'light');
  const autoThemes = AVAILABLE_THEMES.filter(t => t.category === 'auto');

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="Alternar Tema (Preto, Branco ou Programado)"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
          isOpen
            ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-sm'
            : 'border-[#3f3f46]/40 text-slate-300 hover:text-white hover:bg-[#27272a]/60'
        }`}
      >
        <span className="text-rose-400">{getThemeIcon()}</span>
        <span className="text-[11px] hidden md:inline">Tema</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-[#18181b] border border-[#27272a] rounded-2xl shadow-2xl z-50 p-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#27272a]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
              <Palette className="w-3.5 h-3.5 text-rose-400" />
              <span>Temas & Aparência</span>
            </div>
            {onOpenPreferences && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenPreferences();
                }}
                className="text-[10px] text-rose-400 hover:text-rose-300 underline"
              >
                Configurar
              </button>
            )}
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {/* Grupo: Pretos & Escuros */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1.5 flex items-center gap-1">
                <Moon className="w-3 h-3 text-slate-400" />
                <span>Temas Pretos & Escuros</span>
              </div>
              <div className="space-y-1">
                {darkThemes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTheme(t.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition-all ${
                      selectedTheme === t.id
                        ? 'bg-rose-500/15 text-white font-medium border border-rose-500/30'
                        : 'text-slate-300 hover:bg-[#27272a] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: t.colors.bg }}
                      />
                      <span>{t.name}</span>
                    </div>
                    {selectedTheme === t.id && <Check className="w-3.5 h-3.5 text-rose-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Grupo: Brancos & Claros */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1.5 flex items-center gap-1">
                <Sun className="w-3 h-3 text-amber-400" />
                <span>Temas Brancos & Claros</span>
              </div>
              <div className="space-y-1">
                {lightThemes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTheme(t.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition-all ${
                      selectedTheme === t.id
                        ? 'bg-rose-500/15 text-white font-medium border border-rose-500/30'
                        : 'text-slate-300 hover:bg-[#27272a] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-slate-400/40 shrink-0 shadow-sm"
                        style={{ backgroundColor: t.colors.bg }}
                      />
                      <span>{t.name}</span>
                    </div>
                    {selectedTheme === t.id && <Check className="w-3.5 h-3.5 text-rose-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Grupo: Programado & Automático */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 mb-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3 text-indigo-400" />
                <span>Inteligente & Programado</span>
              </div>
              <div className="space-y-1">
                {autoThemes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectTheme(t.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left text-xs transition-all ${
                      selectedTheme === t.id
                        ? 'bg-rose-500/15 text-white font-medium border border-rose-500/30'
                        : 'text-slate-300 hover:bg-[#27272a] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {t.id === 'system' ? (
                        <Monitor className="w-3.5 h-3.5 text-indigo-400" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                      )}
                      <div>
                        <div>{t.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal truncate max-w-[170px]">
                          {t.id === 'system'
                            ? `Windows (${effectiveTheme.startsWith('dark') ? 'Escuro' : 'Claro'})`
                            : 'Claro de dia / Escuro à noite'}
                        </div>
                      </div>
                    </div>
                    {selectedTheme === t.id && <Check className="w-3.5 h-3.5 text-rose-400" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
