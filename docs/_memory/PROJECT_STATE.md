# ESTADO PERSISTENTE DO PROJETO & HISTÓRICO DE ARQUITETURA
**OmniPDF Studio — Memória Contínua (Memory Architect Ledger)**

> **Última Atualização:** 28/10/2026  
> **Versão Corrente:** `v1.2.1`  
> **Repositório GitHub:** `https://github.com/Henrique1601/OmniPDF-Studio`  
> **Landing Page Oficial (Vercel):** `https://landing-topaz-ten-44.vercel.app` (Projeto: `prj_TNw1ze69DnSnfWrqqxJ62WrWhBY2`, Usuário: `henrique1601`)

---

## 1. Registro de Releases & Marcos

| Versão | Data | Principais Entregas |
|---|---|---|
| **v1.0.0** | Out/2026 | Lançamento inicial da suíte de 20+ ferramentas offline para PDF e IA local/Gemini. |
| **v1.1.0** | 28/10/2026 | Suporte inicial a temas e novo sistema de preferências. |
| **v1.1.1** | 28/10/2026 | Implementação de Ícones de alta resolução (.ico/.png), Associação de Arquivos (`.pdf`), Hardening de Segurança (OWASP/WACK, CSP restrito, bloqueio de will-navigate e permissões). |
| **v1.1.2** | 28/10/2026 | Refatoração de Alto Contraste para Temas Claros/Brancos (WCAG AAA); Unificação da versão em `src/constants/version.ts`; Sincronização automatizada da Landing Page na Vercel; Criação de regras de governança contínua (`.geminirules`, `.cursorrules`, `docs/_rules/`). |
| **v1.2.0** | 28/10/2026 | Command Palette Universal (`Ctrl + K`) & Atalhos Globais de Teclado; Code Splitting & Lazy Loading (`React.lazy` + `Suspense`); Global Error Boundary no React; Taskbar JumpList do Windows e Barra de Progresso Nativa. |
| **v1.2.1** | 28/10/2026 | **Diferenciação Visual Marcante dos 3 Temas Claros**: Branco Puro (#ffffff), Claro Suave / Prata (#e2e8f0) e Papel Nobre / Marfim (#f5efe6); **Correção Crítica dos Atalhos & Comandos**: Inserção ativa do listener global de teclado (`Ctrl+K`, `Ctrl+O`, `Ctrl+S`, `Ctrl+W`, `Ctrl+,`, `Ctrl+H`), listener direto de `onKeyDown` no input do Command Palette, busca sem acento (*fuzzy normalizer*) e mapeamento de todas as 23 ferramentas. |

---

## 2. Decisões Arquiteturais Chave (ADRs)

- **ADR-001 (Versão Única):** Nenhuma versão deve ser hardcoded no JSX. `src/constants/version.ts` exporta `APP_VERSION`, consumido por todos os componentes.
- **ADR-002 (Landing Deploy Direto):** O projeto Vercel `landing` é publicado via CLI autenticado (`henrique1601`) através de `cd landing && npx vercel --prod --yes`, garantindo que toda release suba no ar simultaneamente com o tag git.
- **ADR-003 (Estilização de Temas Claros):** Remapeamento universal em `src/index.css` cobrindo seletores com opacidades e calibrando cores secundárias (tons 600/700) para máxima legibilidade contra fundos brancos.
- **ADR-004 (Performance via Code Splitting):** O bundle inicial carrega apenas os componentes de casca (`Sidebar`, `TopNav`, `HomeView`), enquanto ferramentas pesadas (OCR/Tesseract, DirectEdit/PDF-Lib, AI Tools) são fragmentadas em chunks assíncronos (`React.lazy`).
- **ADR-005 (Integração Nativa Windows):** Uso de APIs nativas do Electron (`win.setProgressBar` e `app.setJumpList`) para transformar o OmniPDF Studio em um aplicativo desktop de primeira classe no Windows 10/11.
- **ADR-006 (Especificidade Igualitária dos Temas Claros):** Cada tema claro (`light-pure`, `light-slate`, `light-warm`) utiliza a regra de especificidade `html[data-theme="..."]`, eliminando sobrescrita indevida por classes genéricas e garantindo que o fundo prateado e o pergaminho marfim sejam 100% distintos do branco puro.
