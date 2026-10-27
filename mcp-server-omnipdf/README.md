# 📄 OmniPDF MCP Server (`@omnipdf/mcp-server`)

Servidor oficial do **Model Context Protocol (MCP)** do **OmniPDF Studio**. Permite que agentes de Inteligência Artificial (Claude Desktop, Antigravity, Gemini, Cursor) executem manipulações avançadas, edição direta e operações profissionais em arquivos PDF de forma nativa e segura.

---

## 🛠️ Ferramentas Disponíveis para o Agente

| Ferramenta | Descrição |
| :--- | :--- |
| `omnipdf_get_metadata` | Extrai contagem de páginas, título, dimensões e tamanho do PDF. |
| `omnipdf_merge` | Une múltiplos PDFs em um só. |
| `omnipdf_split` | Divide ou extrai páginas específicas para um novo PDF. |
| `omnipdf_compress` | Compacta o PDF utilizando Object Streams. |
| `omnipdf_watermark` | Aplica marca d'água com texto, opacidade e ângulo. |
| `omnipdf_unlock` | Remove restrições de permissão (cópia e impressão). |
| `omnipdf_number_pages` | Insere numeração sequencial de páginas nos rodapés/cabeçalhos. |
| `omnipdf_trueedit` | **TrueEdit:** Edição e substituição direta de texto nas coordenadas do PDF. |
| `omnipdf_redact` | Censura permanente (tarjas pretas LGPD) em áreas confidenciais. |
| `omnipdf_ocr` | OCR offline de imagens via Tesseract.js. |
| `omnipdf_images_to_pdf` | Converte fotos e imagens em um documento PDF consolidado. |

---

## 🚀 Como Conectar nos seus Agentes

### 1. Claude Desktop (`claude_desktop_config.json`)

Adicione em `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "omnipdf": {
      "command": "node",
      "args": [
        "C:\\Users\\henri\\Documents\\antigravity\\optimistic-planck\\mcp-server-omnipdf\\dist\\index.js"
      ]
    }
  }
}
```

### 2. Antigravity & Gemini CLI (`mcp_config.json`)

```json
{
  "mcpServers": {
    "omnipdf": {
      "command": "node",
      "args": [
        "c:/Users/henri/Documents/antigravity/optimistic-planck/mcp-server-omnipdf/dist/index.js"
      ]
    }
  }
}
```

---

## 💻 Compilação Local

```bash
cd mcp-server-omnipdf
npm install
npm run build
```
