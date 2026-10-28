# PROTOCOLO OBRIGATÓRIO DE SINCRONIZAÇÃO DE VERSÕES & RELEASES
**OmniPDF Studio — Governança Contínua (Memory & Global Master Protocol)**

> **STATUS:** VIGENTE E OBRIGATÓRIO  
> **APLICAÇÃO:** Toda atualização, hotfix ou nova funcionalidade lançada.  
> **OBJETIVO:** Eliminar 100% de discrepâncias entre a versão exibida no aplicativo Windows, a versão publicada na Landing Page (Vercel) e os releases oficiais do GitHub.

---

## 1. Regra das Quatro Fontes Sincronizadas

Toda nova release do OmniPDF Studio **DEVE** atualizar simultaneamente os seguintes pontos:

| # | Arquivo / Alvo | O que deve ser atualizado | Papel |
|---|---|---|---|
| **1** | `package.json` | Campo `"version": "X.Y.Z"` | Versão do manifesto do Node.js e Electron |
| **2** | `src/constants/version.ts` | Constante `APP_VERSION = 'X.Y.Z'` | Fonte da verdade única para componentes UI (`Sidebar`, `HomeView`, `PreferencesView`) |
| **3** | `landing/index.html` | Textos visíveis (`vX.Y.Z`) e links diretos para `OmniPDF.Studio.Setup.X.Y.Z.exe` | Vitrine pública e download para os usuários |
| **4** | **Landing Page na Vercel** | Execução de `npx vercel --prod --yes` na pasta `landing/` | Publicação imediata no domínio oficial `https://landing-topaz-ten-44.vercel.app` |
| **5** | **Git Tag & Release** | `git tag vX.Y.Z && git push origin vX.Y.Z` | Disparo automático do GitHub Actions para compilação do instalador `.exe` e upload nos Releases |

---

## 2. Checklist Operacional Passo a Passo

Antes de fazer o push de uma nova versão:

1. **Atualizar `package.json` e `src/constants/version.ts`:**
   - Garantir que a versão segue Semantic Versioning (`MAJOR.MINOR.PATCH`).
2. **Atualizar `landing/index.html`:**
   - Atualizar a badge superior (`OmniPDF Studio vX.Y.Z Oficial para Windows`).
   - Atualizar o link principal de download: `href="https://github.com/Henrique1601/OmniPDF-Studio/releases/latest/download/OmniPDF.Studio.Setup.X.Y.Z.exe"`.
   - Atualizar os textos de botões e badges (`vX.Y.Z Ready`).
3. **Deploy da Landing Page na Vercel:**
   ```powershell
   cd landing
   npx vercel --prod --yes
   cd ..
   ```
   *Verificar se `https://landing-topaz-ten-44.vercel.app` já exibe a nova versão.*
4. **Validar a Sincronização via Script:**
   ```powershell
   npm run sync:release
   ```
5. **Commit e Tag:**
   ```powershell
   git add .
   git commit -m "chore(release): bump version to X.Y.Z"
   git tag vX.Y.Z
   git push origin master --tags
   ```

---

## 3. Proibições Estritas (Zero-Drift Policy)

- ❌ **NUNCA** codificar versões "hardcoded" (`v1.0.0`, `v1.1.0`) em arquivos `.tsx` ou componentes React. SEMPRE importar de `src/constants/version.ts`.
- ❌ **NUNCA** fazer release no GitHub sem fazer o deploy correspondente na Vercel.
- ❌ **NUNCA** alterar apenas o `package.json` sem refletir na landing page e no `APP_VERSION`.
