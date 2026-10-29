# ESTADO PERSISTENTE DO PROJETO & HISTÓRICO DE ARQUITETURA
**OmniPDF Studio — Memória Contínua (Memory Architect Ledger)**

> **Última Atualização:** 29/10/2026  
> **Versão Corrente:** `v1.4.0`  
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
| **v1.3.0** | 29/10/2026 | **Tour Guiado & Onboarding Interativo para Iniciantes** (Modal visual em 6 passos amigáveis, navegação por teclado e persistência local); **Novas Configurações Expandidas** (Preferências reais de Visualização/Zoom, Painel lateral de miniaturas, Modo Leitura Noturna, Pastas e Sufixos de Exportação configuráveis, Limpeza de Dados/Privacidade e gatilho do Tour); Pontos de acesso no TopNav (ícone HelpCircle), HomeView (botão Hero) e primeiro acesso automático. |
| **v1.4.0** | 29/10/2026 | **Acrobat Live Studio & Overhaul de Ferramentas**: (1) **Notificações de Atualização Duplas**: Checagem automática no boot, polling periódico e fallback resiliente via API oficial do GitHub; (2) **HighlightTool Visão Completa**: Fim do corte vertical da página, zoom de ajuste à tela e seleção livre arrastando o mouse (Drag-to-Highlight); (3) **WatermarkTool com PDF Real & Ângulos Corrigidos**: Prévia ao vivo sobre a página real do PDF, rotação corrigida em sincronia matemática com o arquivo exportado, presets de cor e ângulo; (4) **PDF para Imagens em Lote**: Conversão de todas as páginas ou intervalos selecionados direto para uma pasta no Windows com barra de progresso nativa; (5) **Acrobat Live Studio**: Abertura direta do documento em espaço de trabalho unificado com todas as ferramentas ativas ao vivo (texto livre, marcação, tarja preta, assinatura e marca d'água com salvamento atômico Ctrl+S). |

---

## 2. Decisões Arquiteturais Chave (ADRs)

- **ADR-001 (Versão Única):** Nenhuma versão deve ser hardcoded no JSX. `src/constants/version.ts` exporta `APP_VERSION`, consumido por todos os componentes.
- **ADR-002 (Landing Deploy Direto):** O projeto Vercel `landing` é publicado via CLI autenticado (`henrique1601`) através de `cd landing && npx vercel --prod --yes`, garantindo que toda release suba no ar simultaneamente com o tag git.
- **ADR-003 (Estilização de Temas Claros):** Remapeamento universal em `src/index.css` cobrindo seletores com opacidades e calibrando cores secundárias (tons 600/700) para máxima legibilidade contra fundos brancos.
- **ADR-004 (Performance via Code Splitting):** O bundle inicial carrega apenas os componentes de casca (`Sidebar`, `TopNav`, `HomeView`), enquanto ferramentas pesadas (OCR/Tesseract, DirectEdit/PDF-Lib, AI Tools) são fragmentadas em chunks assíncronos (`React.lazy`).
- **ADR-005 (Integração Nativa Windows):** Uso de APIs nativas do Electron (`win.setProgressBar` e `app.setJumpList`) para transformar o OmniPDF Studio em um aplicativo desktop de primeira classe no Windows 10/11.
- **ADR-006 (Especificidade Igualitária dos Temas Claros):** Cada tema claro (`light-pure`, `light-slate`, `light-warm`) utiliza a regra de especificidade `html[data-theme="..."]`, eliminando sobrescrita indevida por classes genéricas e garantindo que o fundo prateado e o pergaminho marfim sejam 100% distintos do branco puro.
- **ADR-007 (Onboarding Amigável & Acessibilidade para Leigos):** Introdução de um componente visual e interativo de boas-vindas (`AppTourModal`) com dicas práticas e linguagem acessível, garantindo que novos usuários aproveitem as ferramentas sem curva de aprendizado.
- **ADR-008 (Adobe Acrobat Unified Live Workspace):** Transição de ferramentas puramente isoladas para um estúdio unificado ao vivo (`ReaderView` / Acrobat Studio), onde abrir qualquer PDF permite escrever textos livres, grifar, censurar dados com tarja preta, assinar e carimbar diretamente sobre o documento em tempo real com salvamento atômico em um único clique.
