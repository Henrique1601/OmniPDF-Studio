# HbsPDFed - Leitor & Editor de PDF Moderno e Offline

**HbsPDFed** é um aplicativo desktop completo para leitura, edição e manipulação de arquivos PDF, recriado a partir do estudo de engenharia reversa do iLovePDF com arquitetura moderna, privada e **100% offline**.

---

## 🚀 Instalador Gerado

O instalador executável oficial para Windows já está pronto e compilado:

- 📦 **Instalador Oficial:** `dist-package\HbsPDFed Setup 1.0.0.exe`
- 📁 **Versão Portátil (Executável Direto):** `dist-package\win-unpacked\HbsPDFed.exe`

Ao executar o instalador `HbsPDFed Setup 1.0.0.exe`:
1. Você pode escolher a pasta de instalação.
2. É criado automaticamente um atalho na **Área de Trabalho (Desktop)** e no **Menu Iniciar**.
3. O desinstalador oficial também é registrado no Windows.

---

## 🛠️ Funcionalidades Disponíveis

| Ferramenta | Descrição |
| :--- | :--- |
| 📖 **Visualizador PDF** | Leitor interativo com miniaturas laterais, zoom contínuo, rotação e navegação ágil. |
| 📑 **Juntar PDFs (Merge)** | Unifique 2 ou mais arquivos PDF em qualquer ordem desejada. |
| ✂️ **Dividir PDF (Split)** | Extraia intervalos de páginas (ex: `1-3, 5, 8-10`) em novos documentos. |
| 🗂️ **Organizar Páginas** | Grade visual para girar 90°, reordenar ou excluir páginas individuais. |
| 🗜️ **Compactar PDF** | Otimização estrutural com Object Streams e descarte de dados redundantes. |
| 💧 **Marca d'Água** | Carimbos personalizados com controle de tamanho, opacidade e ângulo. |
| 🔒 **Proteger com Senha** | Camada de segurança e integridade com proteção por senha. |
| 🖼️ **PDF para Imagem** | Renderização em alta definição para arquivos PNG ou JPEG. |
| 📸 **Imagens para PDF** | Conversão de fotos, recibos ou capturas de tela (PNG/JPG) em um PDF único. |
| ✍️ **Editar & Anotar** | Inserção de textos e notas permanentes gravadas no PDF. |

---

## 💻 Arquitetura Técnica

- **Shell Desktop:** Electron 33 (com suporte completo a IPC, diálogos nativos do Windows e isolamento de contexto)
- **Interface Gráfica:** React 18, TypeScript, Tailwind CSS, Lucide Icons
- **Visualizador:** PDF.js (Mozilla) com renderização Canvas de alto desempenho
- **Motor de Manipulação:** `pdf-lib` (processamento binário local sem envio para servidores de terceiros)
- **Empacotador:** `electron-builder` com gerador de instaladores NSIS

---

## 🏃 Como Rodar em Modo de Desenvolvimento

```bash
# Instalar dependências
npm install

# Iniciar em modo de desenvolvimento
npm run dev

# Gerar novo instalador .exe
npm run dist
```
