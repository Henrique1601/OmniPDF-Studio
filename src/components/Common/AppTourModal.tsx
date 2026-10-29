import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  FolderOpen,
  Type,
  Shield,
  Layers,
  Search,
  Palette,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  Compass,
  FileText,
  Lock,
  Cpu,
  Zap,
  HelpCircle
} from 'lucide-react';

interface AppTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateNav?: (nav: 'home' | 'tools' | 'recents' | 'preferences') => void;
  onOpenPreferences?: () => void;
}

interface TourStep {
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  icon: React.ElementType;
  iconColor: string;
  bgGradient: string;
  tips: string[];
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Bem-vindo ao OmniPDF Studio!',
    subtitle: 'Sua suíte completa e definitiva para documentos PDF',
    description:
      'O OmniPDF Studio foi desenvolvido para você realizar qualquer tarefa com PDFs de forma rápida, simples e totalmente offline. Seus arquivos nunca são enviados para a internet sem sua autorização, garantindo 100% de privacidade.',
    badge: 'Passo 1 de 6 • Boas-vindas',
    icon: Compass,
    iconColor: 'text-brand-500',
    bgGradient: 'from-brand-500/20 via-rose-500/10 to-transparent',
    tips: [
      'Privacidade total: todas as operações essenciais rodam direto no seu computador',
      'Gratuito, sem limites de páginas e sem marcas d\'água indesejadas',
      'Interface limpa pensada tanto para tarefas rápidas quanto para trabalhos pesados'
    ]
  },
  {
    title: 'Como Abrir e Visualizar Arquivos',
    subtitle: 'Arraste, solte ou use atalhos rápidos',
    description:
      'Você pode abrir qualquer documento PDF de três formas super fáceis: arrastando o arquivo direto para a tela, clicando no botão "Abrir Documento" ou pressionando o atalho Ctrl + O.',
    badge: 'Passo 2 de 6 • Leitura & Abertura',
    icon: FolderOpen,
    iconColor: 'text-amber-500',
    bgGradient: 'from-amber-500/20 via-yellow-500/10 to-transparent',
    tips: [
      'Arraste e solte (Drag & Drop) qualquer PDF direto no aplicativo',
      'Atalho universal: pressione Ctrl + O para navegar pelos seus arquivos',
      'Acrobat Live Studio: insira textos livres, grife, carimbe marcas d\'água e assine diretamente sobre as páginas ao vivo'
    ]
  },
  {
    title: 'Mais de 20 Ferramentas Prontas',
    subtitle: 'Tudo o que você precisa em um único lugar',
    description:
      'Organizamos as ferramentas por categorias para facilitar seu dia a dia: Edição de texto real (TrueEdit), Juntar e Dividir PDFs, Comprimir para reduzir tamanho, Assinar com firma digital ou manuscrita e Censura LGPD com tarjas pretas.',
    badge: 'Passo 3 de 6 • Ferramentas & Catálogo',
    icon: Layers,
    iconColor: 'text-cyan-500',
    bgGradient: 'from-cyan-500/20 via-blue-500/10 to-transparent',
    tips: [
      'TrueEdit: altere textos diretamente no documento sem converter para Word',
      'Comprimir PDF: reduza megabytes de tamanho para enviar por e-mail ou WhatsApp',
      'Juntar & Dividir: una relatórios ou extraia apenas as páginas que importam'
    ]
  },
  {
    title: 'Inteligência Artificial Integrada',
    subtitle: 'Chat com documentos, auditoria e tradução automática',
    description:
      'O OmniPDF Studio possui um cérebro de IA com suporte a Gemini 2.5 e Ollama (100% offline). Você pode fazer perguntas ao documento, gerar resumos automáticos, auditar contratos em busca de riscos e multas, e traduzir mantendo o layout original.',
    badge: 'Passo 4 de 6 • Inteligência Artificial',
    icon: Sparkles,
    iconColor: 'text-purple-500',
    bgGradient: 'from-purple-500/20 via-indigo-500/10 to-transparent',
    tips: [
      'Chat com PDF: tire dúvidas, encontre cláusulas e peça resumos executivos',
      'Auditor Jurídico: detecta automaticamente multas ocultas e cláusulas perigosas',
      'Suporte a Ollama: use modelos como Llama 3 totalmente offline no seu PC'
    ]
  },
  {
    title: 'Command Palette: Produtividade Máxima',
    subtitle: 'Pressione Ctrl + K e encontre tudo em 1 segundo',
    description:
      'Não perca tempo procurando botões. A qualquer momento, pressione Ctrl + K para abrir a barra de comandos inteligente. Digite qualquer termo como "comprimir", "assinar", "ia" ou o nome de um arquivo recente.',
    badge: 'Passo 5 de 6 • Atalhos & Busca',
    icon: Search,
    iconColor: 'text-indigo-500',
    bgGradient: 'from-indigo-500/20 via-sky-500/10 to-transparent',
    tips: [
      'Atalho universal: Ctrl + K funciona em qualquer tela do aplicativo',
      'Busca inteligente tolerante a acentos e erros de digitação',
      'Outros atalhos: Ctrl + S para salvar, Ctrl + W para fechar, Ctrl + , para configurações'
    ]
  },
  {
    title: 'Personalização, Temas & Configurações',
    subtitle: 'Cores que respeitam seus olhos e adaptadas ao seu estilo',
    description:
      'Escolha entre temas escuros profundos (incluindo Preto Ônix para telas OLED) e temas claros de alto contraste: Branco Puro, Claro Suave (Cinza Prateado) e Papel Nobre (Marfim editorial). Você também pode configurar tamanho de zoom e preferências de salvamento.',
    badge: 'Passo 6 de 6 • Pronto para Usar!',
    icon: Palette,
    iconColor: 'text-emerald-500',
    bgGradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    tips: [
      'Troque de tema a qualquer momento pelo menu superior ou pelas Preferências',
      'Modo automático sincronizado com o horário do dia ou com o Windows',
      'Você pode rever este tour quando quiser através das Configurações'
    ]
  }
];

export const AppTourModal: React.FC<AppTourModalProps> = ({
  isOpen,
  onClose,
  onNavigateNav,
  onOpenPreferences
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    try {
      localStorage.setItem('omnipdf_tour_seen', 'true');
    } catch {
      // ignore
    }
    onClose();
  };

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 select-none"
      onClick={handleComplete}
    >
      <div
        className="relative w-full max-w-xl bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header with Progress and Close */}
        <div className="relative px-6 pt-6 pb-4 flex items-center justify-between border-b border-[var(--border-color)]/60">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase bg-[var(--hover-bg)] text-[var(--text-muted)] border border-[var(--border-color)]">
              {step.badge}
            </span>
          </div>

          <button
            type="button"
            onClick={handleComplete}
            title="Pular tour (Esc)"
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full h-1 bg-[var(--border-color)]/40 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-brand-500 via-rose-500 to-amber-500 transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / TOUR_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Step Body */}
        <div className="p-6 space-y-6">
          {/* Header Icon + Titles */}
          <div className="flex items-start gap-4">
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.bgGradient} border border-[var(--border-color)] flex items-center justify-center shrink-0 shadow-sm`}
            >
              <Icon className={`w-7 h-7 ${step.iconColor}`} />
            </div>

            <div className="min-w-0">
              <h2 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
                {step.title}
              </h2>
              <p className="text-xs font-semibold text-[var(--text-muted)] mt-0.5">
                {step.subtitle}
              </p>
            </div>
          </div>

          {/* Main Description */}
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--card-bg-subtle)] p-4 rounded-2xl border border-[var(--border-color)]/60">
            {step.description}
          </p>

          {/* Dicas Rápidas / Destaques do Passo */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Dicas & Como Usar:
            </div>
            <div className="space-y-1.5">
              {step.tips.map((tip, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 text-xs text-[var(--text-secondary)]"
                >
                  <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 font-bold text-[10px]">
                    ✓
                  </div>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step Indicator Dots */}
        <div className="flex justify-center items-center gap-1.5 pb-2">
          {TOUR_STEPS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentStep(idx)}
              title={`Ir para o passo ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentStep
                  ? 'w-6 bg-brand-500'
                  : 'w-1.5 bg-[var(--border-color)] hover:bg-[var(--text-muted)]'
              }`}
            />
          ))}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="px-6 py-4 border-t border-[var(--border-color)] bg-[var(--card-bg-subtle)] flex items-center justify-between">
          <button
            type="button"
            onClick={handleComplete}
            className="text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            Pular Tour
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-primary)] text-xs font-semibold hover:bg-[var(--hover-bg)] transition-all flex items-center gap-1.5"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-rose-600 hover:from-brand-500 hover:to-rose-500 text-white text-xs font-semibold shadow-lg shadow-brand-500/20 transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>{isLastStep ? 'Concluir & Começar' : 'Próximo'}</span>
              {isLastStep ? <Check className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
