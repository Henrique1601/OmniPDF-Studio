# POLÍTICA DE CONTRASTE, TEMAS & ACESSIBILIDADE WCAG AAA
**OmniPDF Studio — Diretrizes Visuais de Modo Claro & Escuro**

> **STATUS:** VIGENTE E OBRIGATÓRIO  
> **APLICAÇÃO:** Qualquer alteração em estilos, CSS, novos componentes ou views.  
> **OBJETIVO:** Garantir 100% de legibilidade cristalina tanto em temas escuros (Moderno, OLED puro, Midnight) quanto em temas claros/brancos (Branco Puro, Claro Suave, Papel Nobre).

---

## 1. O Problema Histórico Resolvido

Anteriormente, o uso de classes Tailwind utilitárias como `text-slate-100`, `text-slate-200` e fundos com opacidade `bg-slate-900/80` causavam:
- Letras pretas forçadas em cards que mantinham fundo escuro por causa de opacidade (`/80`), resultando em texto preto sobre fundo preto.
- Seletores genéricos `[class*="bg-gradient-to"] *` tornando todo o texto branco em fundos que deveriam ser claros.
- Ícones com cores claras (`amber-400`, `emerald-400`, `slate-400`) sem contraste suficiente sobre superfícies brancas.

---

## 2. Padrões Obrigatórios de Arquitetura CSS

1. **Remapeamento Universal em `src/index.css`:**
   - Todos os seletores de fundo escuro com opacidade (`[class*="bg-slate-900"]`, `[class*="bg-slate-950"]`) são remapeados para `var(--card-bg)` quando `html[data-theme-group="light"]` estiver ativo.
   - Botões com classes neutras escuras (`[class*="bg-slate-800"]`) recebem `var(--card-bg-subtle)` com borda sutil e sombra suave no modo claro.
2. **Cores de Texto de Destaque Calibradas para o Modo Claro:**
   - Tons `400` em modo escuro são automaticamente elevados para tons `600` ou `700` no modo claro via CSS:
     - `text-rose-400` -> `#e11d48` (Rose 600)
     - `text-amber-400` -> `#b45309` (Amber 700)
     - `text-emerald-400` -> `#047857` (Emerald 700)
     - `text-purple-400` -> `#7e22ce` (Purple 700)
     - `text-indigo-400` -> `#4338ca` (Indigo 700)
     - `text-cyan-400` -> `#0369a1` (Sky 700)
3. **Preservação de Botões Coloridos:**
   - Botões com `bg-brand-600`, `bg-rose-600`, `bg-emerald-600` e gradientes de ação mantêm texto `#ffffff !important` em qualquer tema.
4. **Hero & AI Banners:**
   - Banners que usam `from-slate-900` ou `from-purple-950` são reestilizados no modo claro para fundos luminosos com gradiente suave (`linear-gradient(135deg, #ffffff 0%, #f8fafc 60%, #fff1f2 100%)`) e sombras elegantes.

---

## 3. Teste de Validação de Tema

Antes de concluir qualquer tarefa de interface:
1. Alternar para o tema **"Branco Puro"** e inspecionar se todos os textos estão pretos (`#0f172a`) e legíveis.
2. Alternar para o tema **"Claro Suave"** e **"Papel Nobre"**.
3. Alternar para o tema **"Preto Ônix (OLED)"** e confirmar o contraste de `#000000`.
