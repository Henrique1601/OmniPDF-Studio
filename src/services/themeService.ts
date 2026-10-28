import { ThemeId, ThemeDefinition } from '../types';

export const AVAILABLE_THEMES: ThemeDefinition[] = [
  // --- TEMAS PRETOS / ESCUROS ---
  {
    id: 'dark-slate',
    name: 'Escuro Moderno',
    category: 'dark',
    description: 'Visual padrão sofisticado em tons de ardósia azulada e grafite.',
    colors: {
      bg: '#0d0e12',
      card: '#18181b',
      nav: '#18181b',
      border: '#27272a',
      text: '#f8fafc',
      accent: '#e11d48'
    }
  },
  {
    id: 'dark-oled',
    name: 'Preto Ônix (OLED)',
    category: 'dark',
    description: 'Preto puro absoluto #000000 para máximo contraste e economia em telas OLED.',
    colors: {
      bg: '#000000',
      card: '#0a0a0c',
      nav: '#0a0a0c',
      border: '#1f1f23',
      text: '#ffffff',
      accent: '#f43f5e'
    }
  },
  {
    id: 'dark-midnight',
    name: 'Meia-Noite Cyber',
    category: 'dark',
    description: 'Azul marinho profundo com estética noturna ultra moderna.',
    colors: {
      bg: '#060913',
      card: '#0f172a',
      nav: '#0f172a',
      border: '#1e293b',
      text: '#e2e8f0',
      accent: '#38bdf8'
    }
  },

    // --- TEMAS BRANCOS / CLAROS ---
  {
    id: 'light-pure',
    name: 'Branco Puro',
    category: 'light',
    description: 'Branco límpido e minimalista tipo Apple Studio com estética clean de alta precisão.',
    colors: {
      bg: '#ffffff',
      card: '#ffffff',
      nav: '#f8fafc',
      border: '#e2e8f0',
      text: '#0f172a',
      accent: '#e11d48'
    }
  },
  {
    id: 'light-slate',
    name: 'Claro Suave (Prata)',
    category: 'light',
    description: 'Mesa de trabalho em cinza prateado com cartões brancos destacados, prevenindo fadiga ocular.',
    colors: {
      bg: '#e2e8f0',
      card: '#ffffff',
      nav: '#f1f5f9',
      border: '#cbd5e1',
      text: '#0f172a',
      accent: '#0284c7'
    }
  },
  {
    id: 'light-warm',
    name: 'Papel Nobre (Marfim)',
    category: 'light',
    description: 'Tons quentes de pergaminho, linho e marfim editorial, perfeito para leitura prolongada.',
    colors: {
      bg: '#f5efe6',
      card: '#fffdf9',
      nav: '#ebe0d0',
      border: '#cfbda4',
      text: '#292524',
      accent: '#d97706'
    }
  },

  // --- PROGRAMADO & INTELIGENTE ---
  {
    id: 'system',
    name: 'Sincronizado com o Sistema',
    category: 'auto',
    description: 'Segue automaticamente o modo Claro ou Escuro configurado no seu Windows.',
    colors: {
      bg: '#18181b',
      card: '#27272a',
      nav: '#18181b',
      border: '#3f3f46',
      text: '#f8fafc',
      accent: '#6366f1'
    }
  },
  {
    id: 'scheduled',
    name: 'Programado por Horário',
    category: 'auto',
    description: 'Automático: Tema Claro durante o dia e Escuro à noite com base no relógio.',
    colors: {
      bg: '#0f172a',
      card: '#1e293b',
      nav: '#0f172a',
      border: '#334155',
      text: '#f8fafc',
      accent: '#f59e0b'
    }
  }
];

type ThemeListener = (effectiveTheme: ThemeId, selectedTheme: ThemeId) => void;

class ThemeServiceClass {
  private listeners: Set<ThemeListener> = new Set();
  private timer: any = null;
  private mediaQuery: MediaQueryList | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  public getAvailableThemes(): ThemeDefinition[] {
    return AVAILABLE_THEMES;
  }

  public getSelectedTheme(): ThemeId {
    try {
      const saved = localStorage.getItem('omnipdf_theme_id') as ThemeId;
      if (saved && AVAILABLE_THEMES.some(t => t.id === saved)) {
        return saved;
      }
    } catch {
      // fallback
    }
    return 'dark-slate';
  }

  public getScheduleSettings(): { dayStart: string; nightStart: string } {
    try {
      const dayStart = localStorage.getItem('omnipdf_theme_day_start') || '06:00';
      const nightStart = localStorage.getItem('omnipdf_theme_night_start') || '18:00';
      return { dayStart, nightStart };
    } catch {
      return { dayStart: '06:00', nightStart: '18:00' };
    }
  }

  public setScheduleSettings(dayStart: string, nightStart: string): void {
    try {
      localStorage.setItem('omnipdf_theme_day_start', dayStart);
      localStorage.setItem('omnipdf_theme_night_start', nightStart);
      this.applyTheme();
    } catch (e) {
      console.error(e);
    }
  }

  public setSelectedTheme(theme: ThemeId): void {
    try {
      localStorage.setItem('omnipdf_theme_id', theme);
      this.applyTheme(theme);
    } catch (e) {
      console.error(e);
    }
  }

  public getEffectiveTheme(selectedTheme?: ThemeId): ThemeId {
    const active = selectedTheme || this.getSelectedTheme();

    if (active === 'system') {
      const isSystemDark = typeof window !== 'undefined' && 
        window.matchMedia && 
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      return isSystemDark ? 'dark-slate' : 'light-pure';
    }

    if (active === 'scheduled') {
      const { dayStart, nightStart } = this.getScheduleSettings();
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      const [dHour, dMin] = dayStart.split(':').map(Number);
      const [nHour, nMin] = nightStart.split(':').map(Number);
      const startMinutes = (dHour || 6) * 60 + (dMin || 0);
      const endMinutes = (nHour || 18) * 60 + (nMin || 0);

      // Between dayStart and nightStart = Day theme
      const isDaytime = currentMinutes >= startMinutes && currentMinutes < endMinutes;
      return isDaytime ? 'light-pure' : 'dark-slate';
    }

    return active;
  }

  public isDarkTheme(themeId?: ThemeId): boolean {
    const effective = this.getEffectiveTheme(themeId);
    return effective.startsWith('dark');
  }

  public applyTheme(themeId?: ThemeId): ThemeId {
    const selected = themeId || this.getSelectedTheme();
    const effective = this.getEffectiveTheme(selected);
    const isDark = effective.startsWith('dark');

    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      root.setAttribute('data-theme', effective);
      root.setAttribute('data-selected-theme', selected);
      root.setAttribute('data-theme-group', isDark ? 'dark' : 'light');

      if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    }

    // Notify subscribers
    this.listeners.forEach(fn => fn(effective, selected));
    return effective;
  }

  public subscribe(listener: ThemeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private init(): void {
    // Media query listener for OS changes
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemChange = () => {
        if (this.getSelectedTheme() === 'system') {
          this.applyTheme();
        }
      };

      if (this.mediaQuery.addEventListener) {
        this.mediaQuery.addEventListener('change', handleSystemChange);
      } else {
        // Legacy Safari/Chromium
        this.mediaQuery.addListener(handleSystemChange);
      }
    }

    // Schedule ticker every 30 seconds to automatically trigger day/night changes
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (this.getSelectedTheme() === 'scheduled') {
        this.applyTheme();
      }
    }, 30000);

    // Initial apply
    this.applyTheme();
  }
}

export const ThemeService = new ThemeServiceClass();
