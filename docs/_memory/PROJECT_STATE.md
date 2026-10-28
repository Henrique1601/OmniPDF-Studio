# ESTADO PERSISTENTE DO PROJETO & HISTÓRICO DE ARQUITETURA
**OmniPDF Studio — Memória Contínua (Memory Architect Ledger)**

> **Última Atualização:** 28/10/2026  
> **Versão Corrente:** `v1.1.2`  
> **Repositório GitHub:** `https://github.com/Henrique1601/OmniPDF-Studio`  
> **Landing Page Oficial (Vercel):** `https://landing-topaz-ten-44.vercel.app` (Projeto: `prj_TNw1ze69DnSnfWrqqxJ62WrWhBY2`, Usuário: `henrique1601`)

---

## 1. Registro de Releases & Marcos

| Versão | Data | Principais Entregas |
|---|---|---|
| **v1.0.0** | Out/2026 | Lançamento inicial da suíte de 20+ ferramentas offline para PDF e IA local/Gemini. |
| **v1.1.0** | 28/10/2026 | Suporte inicial a temas e novo sistema de preferências. |
| **v1.1.1** | 28/10/2026 | Implementação de Ícones de alta resolução (.ico/.png), Associação de Arquivos (`.pdf`), Hardening de Segurança (OWASP/WACK, CSP restrito, bloqueio de will-navigate e permissões). |
| **v1.1.2** | 28/10/2026 | **Refatoração Completa de Alto Contraste para Temas Claros/Brancos** (WCAG AAA); Unificação da versão em `src/constants/version.ts`; Sincronização automatizada da Landing Page na Vercel; Criação de regras de governança contínua (`.geminirules`, `.cursorrules`, `docs/_rules/`). |

---

## 2. Decisões Arquiteturais Chave (ADRs)

- **ADR-001 (Versão Única):** Nenhuma versão deve ser hardcoded no JSX. `src/constants/version.ts` exporta `APP_VERSION`, consumido por todos os componentes.
- **ADR-002 (Landing Deploy Direto):** O projeto Vercel `landing` é publicado via CLI autenticado (`henrique1601`) através de `cd landing && npx vercel --prod --yes`, garantindo que toda release suba no ar simultaneamente com o tag git.
- **ADR-003 (Estilização de Temas Claros):** Remapeamento universal em `src/index.css` cobrindo seletores com opacidades e calibrando cores secundárias (tons 600/700) para máxima legibilidade contra fundos brancos.
