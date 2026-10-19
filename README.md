# OmniPDF Studio - Suíte Completa e Inteligente de PDF (100% Offline)

**OmniPDF Studio** é uma suíte desktop profissional para leitura, edição direta, anotações, assinaturas manuscritas e manipulação de arquivos PDF. Construído com arquitetura moderna, privada e **100% offline**, garantindo que seus documentos nunca saiam da sua máquina.

---

## 📦 Instalador Oficial para Windows

O novo instalador oficial com a marca **OmniPDF Studio** está pronto para uso:

- 🚀 **Instalador Oficial:** [`dist-package/OmniPDF Studio Setup 1.0.0.exe`](dist-package/OmniPDF%20Studio%20Setup%201.0.0.exe) (~99.1 MB)
- 📁 **Executável Portátil (Direto):** [`dist-package/win-unpacked/OmniPDF Studio.exe`](dist-package/win-unpacked/OmniPDF%20Studio.exe)

Ao executar o instalador `OmniPDF Studio Setup 1.0.0.exe`:
1. Permite escolher o diretório de instalação.
2. Cria automaticamente os atalhos com a marca **OmniPDF Studio** na **Área de Trabalho** e no **Menu Iniciar**.
3. Registra o desinstalador oficial no Windows.

---

## 🛠️ Suíte Completa de Ferramentas

| Ferramenta | Descrição |
| :--- | :--- |
| ✍️ **Assinar PDF (Manuscrito)** | **FASE 1:** Painel de desenho com física suave para criar e carimbar sua assinatura em qualquer página com ajuste visual de escala e posição. |
| 🔢 **Numerar Páginas** | **FASE 1:** Numeração sequencial automática ("Página X de Y" ou simples) em rodapés e cabeçalhos, com controle de margem e opção de pular capa. |
| 🖍️ **Marca-Texto Inteligente** | **FASE 1:** Destaque trechos importantes com marca-texto fluorescente (amarelo, verde, azul, rosa) diretamente sobre o texto. |
| 🌙 **Modo Noturno (Dark Reader)** | **FASE 1:** Inversão suave e inteligente de contraste no leitor para leitura agradável e sem fadiga visual à noite. |
| ✨ **Editar Texto do PDF (TrueEdit)** | Clique diretamente sobre qualquer texto existente no PDF para alterar em tempo real ou use Localizar e Substituir em lote! |
| 📖 **Visualizador PDF** | Leitor interativo com painel de miniaturas laterais, zoom contínuo, rotação 90° e navegação ágil. |
| 📑 **Juntar PDFs (Merge)** | Unifique 2 ou mais arquivos PDF em qualquer ordem desejada. |
| ✂️ **Dividir PDF (Split)** | Extraia intervalos de páginas (ex: `1-3, 5, 8-10`) em novos documentos. |
| 🗂️ **Organizar Páginas** | Grade visual para girar 90°, reordenar ou excluir páginas individuais. |
| 🗜️ **Compactar PDF** | Otimização estrutural com Object Streams e descarte de dados redundantes. |
| 💧 **Marca d'Água** | Carimbos textuais com controle de tamanho, opacidade e ângulo. |
| 🔒 **Proteger com Senha** | Camada de segurança e integridade com proteção por senha. |
| 🖼️ **PDF para Imagem** | Renderização em alta definição para arquivos PNG ou JPEG. |
| 📸 **Imagens para PDF** | Conversão de fotos, recibos ou capturas de tela (PNG/JPG) em um PDF único. |
| 📝 **Anotar & Notas** | Inserção de anotações permanentes gravadas no PDF. |

---

## 🗺️ Roadmap de Próximas Fases

- **Fase 2:** OCR Offline com Tesseract.js (reconhecimento de texto em scans), Redação e Censura Permanente de dados sensíveis e Comparador Visual de Versões (Side-by-Side Diff).
- **Fase 3:** IA Assistente com o Documento ("Converse com seu PDF" via Google Gemini API e fallback local) e Processamento em Lote de pastas inteiras.

---

## 💻 Arquitetura Técnica

- **Shell Desktop:** Electron 33 (com suporte a IPC seguro, diálogos nativos do Windows e isolamento de contexto)
- **Interface Gráfica:** React 18, TypeScript, Tailwind CSS, Lucide Icons
- **Visualizador:** PDF.js (Mozilla) com renderização Canvas de alta fidelidade
- **Motor de Manipulação:** `pdf-lib` (processamento binário local sem servidores terceiros)
- **Empacotador:** `electron-builder` com instalador NSIS
