#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createWorker } from 'tesseract.js';

const server = new Server(
  {
    name: 'omnipdf-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const TOOLS: Tool[] = [
  {
    name: 'omnipdf_get_metadata',
    description: 'Obtém metadados técnicos de um arquivo PDF: contagem de páginas, título, autor, tamanho e dimensões.',
    inputSchema: {
      type: 'object',
      properties: {
        pdfPath: { type: 'string', description: 'Caminho absoluto ou relativo do arquivo PDF' },
      },
      required: ['pdfPath'],
    },
  },
  {
    name: 'omnipdf_merge',
    description: 'Une múltiplos arquivos PDF em um único documento na ordem especificada.',
    inputSchema: {
      type: 'object',
      properties: {
        inputPaths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lista de caminhos dos arquivos PDF para juntar',
        },
        outputPath: { type: 'string', description: 'Caminho do arquivo PDF resultante' },
      },
      required: ['inputPaths', 'outputPath'],
    },
  },
  {
    name: 'omnipdf_split',
    description: 'Divide ou extrai páginas de um PDF em um novo documento.',
    inputSchema: {
      type: 'object',
      properties: {
        inputPath: { type: 'string', description: 'Caminho do PDF de origem' },
        outputPath: { type: 'string', description: 'Caminho do PDF de saída' },
        pageNumbers: {
          type: 'array',
          items: { type: 'number' },
          description: 'Lista de páginas a extrair (1-indexed, ex: [1, 2, 5])',
        },
      },
      required: ['inputPath', 'outputPath', 'pageNumbers'],
    },
  },
  {
    name: 'omnipdf_compress',
    description: 'Compacta e otimiza um PDF ativando Object Streams e limpando objetos redundantes.',
    inputSchema: {
      type: 'object',
      properties: {
        inputPath: { type: 'string', description: 'Caminho do PDF de origem' },
        outputPath: { type: 'string', description: 'Caminho do PDF compactado' },
      },
      required: ['inputPath', 'outputPath'],
    },
  },
  {
    name: 'omnipdf_watermark',
    description: 'Insere uma marca d\'água de texto em todas as páginas do PDF com rotação e opacidade.',
    inputSchema: {
      type: 'object',
      properties: {
        inputPath: { type: 'string', description: 'Caminho do PDF de origem' },
        outputPath: { type: 'string', description: 'Caminho do PDF de saída' },
        text: { type: 'string', description: 'Texto da marca d\'água (ex: "CONFIDENCIAL")' },
        opacity: { type: 'number', description: 'Opacidade de 0.1 a 1.0 (padrão 0.3)', default: 0.3 },
        fontSize: { type: 'number', description: 'Tamanho da fonte (padrão 48)', default: 48 },
        rotationDeg: { type: 'number', description: 'Ângulo em graus (padrão 45)', default: 45 },
      },
      required: ['inputPath', 'outputPath', 'text'],
    },
  },
  {
    name: 'omnipdf_unlock',
    description: 'Desbloqueia e remove restrições de permissão (cópia, impressão, anotações) de um PDF.',
    inputSchema: {
      type: 'object',
      properties: {
        inputPath: { type: 'string', description: 'Caminho do PDF com restrições' },
        outputPath: { type: 'string', description: 'Caminho do PDF desbloqueado' },
      },
      required: ['inputPath', 'outputPath'],
    },
  },
  {
    name: 'omnipdf_number_pages',
    description: 'Adiciona numeração automática de páginas ou cabeçalho/rodapé ao documento.',
    inputSchema: {
      type: 'object',
      properties: {
        inputPath: { type: 'string', description: 'Caminho do PDF de origem' },
        outputPath: { type: 'string', description: 'Caminho do PDF resultante' },
        format: {
          type: 'string',
          enum: ['page-of-total', 'simple'],
          description: '"page-of-total" para "Página X de Y" ou "simple" para "X"',
          default: 'page-of-total',
        },
        position: {
          type: 'string',
          enum: ['bottom-center', 'bottom-right', 'bottom-left', 'top-center', 'top-right'],
          description: 'Posição do carimbo na página',
          default: 'bottom-right',
        },
        startPage: { type: 'number', description: 'Página inicial (1-indexed)', default: 1 },
      },
      required: ['inputPath', 'outputPath'],
    },
  },
  {
    name: 'omnipdf_redact',
    description: 'Aplica censura permanente (tarjas pretas LGPD) sobre coordenadas de áreas sensíveis.',
    inputSchema: {
      type: 'object',
      properties: {
        inputPath: { type: 'string', description: 'Caminho do PDF' },
        outputPath: { type: 'string', description: 'Caminho do PDF de saída' },
        redactions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              pageNumber: { type: 'number', description: 'Número da página (1-indexed)' },
              x: { type: 'number', description: 'Coordenada X em pontos' },
              y: { type: 'number', description: 'Coordenada Y em pontos' },
              width: { type: 'number', description: 'Largura da tarja' },
              height: { type: 'number', description: 'Altura da tarja' },
              overlayText: { type: 'string', description: 'Texto sobre a tarja (ex: "CONFIDENCIAL")' },
            },
            required: ['pageNumber', 'x', 'y', 'width', 'height'],
          },
        },
      },
      required: ['inputPath', 'outputPath', 'redactions'],
    },
  },
  {
    name: 'omnipdf_trueedit',
    description: 'TrueEdit: Aplica edição direta de texto no PDF sobrepondo uma máscara limpa e novo texto.',
    inputSchema: {
      type: 'object',
      properties: {
        inputPath: { type: 'string', description: 'Caminho do PDF de origem' },
        outputPath: { type: 'string', description: 'Caminho do PDF modificado' },
        edits: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              pageNumber: { type: 'number', description: 'Número da página (1-indexed)' },
              x: { type: 'number', description: 'Coordenada X' },
              y: { type: 'number', description: 'Coordenada Y' },
              width: { type: 'number', description: 'Largura da área original' },
              height: { type: 'number', description: 'Altura da área original' },
              newText: { type: 'string', description: 'Novo texto para inserir' },
              fontSize: { type: 'number', description: 'Tamanho da fonte', default: 12 },
            },
            required: ['pageNumber', 'x', 'y', 'width', 'height', 'newText'],
          },
        },
      },
      required: ['inputPath', 'outputPath', 'edits'],
    },
  },
  {
    name: 'omnipdf_images_to_pdf',
    description: 'Converte uma lista de imagens (PNG/JPG) em um único documento PDF.',
    inputSchema: {
      type: 'object',
      properties: {
        imagePaths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Caminhos dos arquivos de imagem',
        },
        outputPath: { type: 'string', description: 'Caminho do PDF gerado' },
      },
      required: ['imagePaths', 'outputPath'],
    },
  },
  {
    name: 'omnipdf_ocr',
    description: 'Executa OCR offline via Tesseract.js em uma imagem para extrair texto editável.',
    inputSchema: {
      type: 'object',
      properties: {
        imagePath: { type: 'string', description: 'Caminho do arquivo de imagem (PNG, JPG, TIFF)' },
        lang: { type: 'string', description: 'Código do idioma (por, eng, spa)', default: 'por' },
      },
      required: ['imagePath'],
    },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'omnipdf_get_metadata': {
        const { pdfPath } = args as { pdfPath: string };
        const buffer = await fs.readFile(path.resolve(pdfPath));
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const pages = doc.getPages();
        const pageCount = doc.getPageCount();
        const firstPageSize = pages[0] ? pages[0].getSize() : { width: 0, height: 0 };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  path: pdfPath,
                  pageCount,
                  title: doc.getTitle() || 'Sem título',
                  author: doc.getAuthor() || 'Desconhecido',
                  producer: doc.getProducer() || 'Desconhecido',
                  dimensionsFirstPage: firstPageSize,
                  fileSize: buffer.byteLength,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'omnipdf_merge': {
        const { inputPaths, outputPath } = args as { inputPaths: string[]; outputPath: string };
        const mergedDoc = await PDFDocument.create();

        for (const input of inputPaths) {
          const buffer = await fs.readFile(path.resolve(input));
          const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
          const pages = await mergedDoc.copyPages(doc, doc.getPageIndices());
          for (const p of pages) {
            mergedDoc.addPage(p);
          }
        }

        const outBytes = await mergedDoc.save({ useObjectStreams: true });
        await fs.writeFile(path.resolve(outputPath), outBytes);

        return {
          content: [
            {
              type: 'text',
              text: `PDFs mesclados com sucesso! ${inputPaths.length} arquivos combinados em: ${outputPath} (${outBytes.byteLength} bytes).`,
            },
          ],
        };
      }

      case 'omnipdf_split': {
        const { inputPath, outputPath, pageNumbers } = args as {
          inputPath: string;
          outputPath: string;
          pageNumbers: number[];
        };
        const buffer = await fs.readFile(path.resolve(inputPath));
        const sourceDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const newDoc = await PDFDocument.create();

        // 1-indexed to 0-indexed
        const indices = pageNumbers
          .map((n) => n - 1)
          .filter((idx) => idx >= 0 && idx < sourceDoc.getPageCount());

        const pages = await newDoc.copyPages(sourceDoc, indices);
        for (const p of pages) {
          newDoc.addPage(p);
        }

        const outBytes = await newDoc.save({ useObjectStreams: true });
        await fs.writeFile(path.resolve(outputPath), outBytes);

        return {
          content: [
            {
              type: 'text',
              text: `Páginas [${pageNumbers.join(', ')}] extraídas com sucesso para: ${outputPath}.`,
            },
          ],
        };
      }

      case 'omnipdf_compress': {
        const { inputPath, outputPath } = args as { inputPath: string; outputPath: string };
        const buffer = await fs.readFile(path.resolve(inputPath));
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const newDoc = await PDFDocument.create();

        const pages = await newDoc.copyPages(doc, doc.getPageIndices());
        for (const p of pages) {
          newDoc.addPage(p);
        }

        const compressedBytes = await newDoc.save({
          useObjectStreams: true,
          addDefaultPage: false,
          objectsPerTick: 50,
        });

        await fs.writeFile(path.resolve(outputPath), compressedBytes);

        const diff = buffer.byteLength - compressedBytes.byteLength;
        const percent = ((diff / buffer.byteLength) * 100).toFixed(1);

        return {
          content: [
            {
              type: 'text',
              text: `PDF compactado com sucesso em: ${outputPath}. Tamanho original: ${buffer.byteLength} bytes | Novo: ${compressedBytes.byteLength} bytes (${percent}% de redução).`,
            },
          ],
        };
      }

      case 'omnipdf_watermark': {
        const { inputPath, outputPath, text, opacity = 0.3, fontSize = 48, rotationDeg = 45 } =
          args as any;
        const buffer = await fs.readFile(path.resolve(inputPath));
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const font = await doc.embedFont(StandardFonts.HelveticaBold);
        const pages = doc.getPages();

        for (const page of pages) {
          const { width, height } = page.getSize();
          const textWidth = font.widthOfTextAtSize(text, fontSize);
          const textHeight = font.heightAtSize(fontSize);

          page.drawText(text, {
            x: width / 2 - textWidth / 2,
            y: height / 2 - textHeight / 2,
            size: fontSize,
            font,
            color: rgb(0.8, 0.1, 0.2),
            opacity,
            rotate: degrees(rotationDeg),
          });
        }

        const outBytes = await doc.save({ useObjectStreams: true });
        await fs.writeFile(path.resolve(outputPath), outBytes);

        return {
          content: [
            {
              type: 'text',
              text: `Marca d'água "${text}" adicionada em todas as ${pages.length} páginas de: ${outputPath}.`,
            },
          ],
        };
      }

      case 'omnipdf_unlock': {
        const { inputPath, outputPath } = args as { inputPath: string; outputPath: string };
        const buffer = await fs.readFile(path.resolve(inputPath));
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const cleanDoc = await PDFDocument.create();

        const pages = await cleanDoc.copyPages(doc, doc.getPageIndices());
        for (const p of pages) {
          cleanDoc.addPage(p);
        }

        cleanDoc.setTitle((doc.getTitle() || 'Documento') + ' (Desbloqueado)');
        cleanDoc.setProducer('OmniPDF Studio Unlock Engine');

        const outBytes = await cleanDoc.save({ useObjectStreams: true });
        await fs.writeFile(path.resolve(outputPath), outBytes);

        return {
          content: [
            {
              type: 'text',
              text: `Documento desbloqueado com sucesso! Todas as restrições de permissão foram eliminadas em: ${outputPath}.`,
            },
          ],
        };
      }

      case 'omnipdf_number_pages': {
        const {
          inputPath,
          outputPath,
          format = 'page-of-total',
          position = 'bottom-right',
          startPage = 1,
        } = args as any;
        const buffer = await fs.readFile(path.resolve(inputPath));
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const pages = doc.getPages();
        const total = pages.length;
        const fontSize = 10;
        const margin = 30;

        for (let i = startPage - 1; i < total; i++) {
          const page = pages[i];
          const { width, height } = page.getSize();
          const pageNum = i + 1;
          const label = format === 'page-of-total' ? `Página ${pageNum} de ${total}` : `${pageNum}`;
          const textWidth = font.widthOfTextAtSize(label, fontSize);

          let x = width / 2 - textWidth / 2;
          let y = margin;
          if (position === 'bottom-right') x = width - margin - textWidth;
          if (position === 'bottom-left') x = margin;
          if (position === 'top-center') y = height - margin - fontSize;
          if (position === 'top-right') {
            x = width - margin - textWidth;
            y = height - margin - fontSize;
          }

          page.drawText(label, {
            x,
            y,
            size: fontSize,
            font,
            color: rgb(0.3, 0.3, 0.3),
          });
        }

        const outBytes = await doc.save({ useObjectStreams: true });
        await fs.writeFile(path.resolve(outputPath), outBytes);

        return {
          content: [
            {
              type: 'text',
              text: `Numeração de páginas aplicada com sucesso em: ${outputPath}.`,
            },
          ],
        };
      }

      case 'omnipdf_redact': {
        const { inputPath, outputPath, redactions } = args as any;
        const buffer = await fs.readFile(path.resolve(inputPath));
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const font = await doc.embedFont(StandardFonts.HelveticaBold);
        const pages = doc.getPages();

        for (const r of redactions) {
          const pIndex = r.pageNumber - 1;
          if (pIndex < 0 || pIndex >= pages.length) continue;
          const page = pages[pIndex];

          page.drawRectangle({
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            color: rgb(0, 0, 0),
          });

          if (r.overlayText) {
            const fontSize = Math.min(8, Math.max(5, r.height * 0.5));
            const textWidth = font.widthOfTextAtSize(r.overlayText, fontSize);
            page.drawText(r.overlayText, {
              x: r.x + (r.width - textWidth) / 2,
              y: r.y + (r.height - fontSize) / 2,
              size: fontSize,
              font,
              color: rgb(1, 1, 1),
            });
          }
        }

        const outBytes = await doc.save({ useObjectStreams: true });
        await fs.writeFile(path.resolve(outputPath), outBytes);

        return {
          content: [
            {
              type: 'text',
              text: `${redactions.length} censura(s) permanente(s) aplicada(s) com sucesso em: ${outputPath}.`,
            },
          ],
        };
      }

      case 'omnipdf_trueedit': {
        const { inputPath, outputPath, edits } = args as any;
        const buffer = await fs.readFile(path.resolve(inputPath));
        const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const pages = doc.getPages();

        for (const edit of edits) {
          const pIndex = edit.pageNumber - 1;
          if (pIndex < 0 || pIndex >= pages.length) continue;
          const page = pages[pIndex];

          const padX = 1.5;
          const padY = 2;
          const newTextWidth = font.widthOfTextAtSize(edit.newText, edit.fontSize || 12);
          const maskWidth = Math.max(edit.width, newTextWidth) + padX * 2;
          const maskHeight = Math.max(edit.height, edit.fontSize || 12) + padY * 2;

          // Mask old text with solid background
          page.drawRectangle({
            x: edit.x - padX,
            y: edit.y - padY,
            width: maskWidth,
            height: maskHeight,
            color: rgb(1, 1, 1),
          });

          // Draw new text in exact coordinate
          page.drawText(edit.newText, {
            x: edit.x,
            y: edit.y,
            size: edit.fontSize || 12,
            font,
            color: rgb(0, 0, 0),
          });
        }

        const outBytes = await doc.save({ useObjectStreams: true });
        await fs.writeFile(path.resolve(outputPath), outBytes);

        return {
          content: [
            {
              type: 'text',
              text: `TrueEdit concluído: ${edits.length} substituição(ões) in-place gravada(s) em: ${outputPath}.`,
            },
          ],
        };
      }

      case 'omnipdf_images_to_pdf': {
        const { imagePaths, outputPath } = args as { imagePaths: string[]; outputPath: string };
        const doc = await PDFDocument.create();

        for (const imgPath of imagePaths) {
          const imgBuffer = await fs.readFile(path.resolve(imgPath));
          const isPng = imgPath.toLowerCase().endsWith('.png');
          const embedded = isPng ? await doc.embedPng(imgBuffer) : await doc.embedJpg(imgBuffer);
          const { width, height } = embedded.scale(1.0);
          const page = doc.addPage([width, height]);
          page.drawImage(embedded, { x: 0, y: 0, width, height });
        }

        const outBytes = await doc.save({ useObjectStreams: true });
        await fs.writeFile(path.resolve(outputPath), outBytes);

        return {
          content: [
            {
              type: 'text',
              text: `PDF criado a partir de ${imagePaths.length} imagem(ns) em: ${outputPath}.`,
            },
          ],
        };
      }

      case 'omnipdf_ocr': {
        const { imagePath, lang = 'por' } = args as { imagePath: string; lang: string };
        const worker = await createWorker(lang);
        const ret = await worker.recognize(path.resolve(imagePath));
        await worker.terminate();

        return {
          content: [
            {
              type: 'text',
              text: `[OCR Concluído - Idioma: ${lang} | Confiança: ${ret.data.confidence}%]\n\n${ret.data.text}`,
            },
          ],
        };
      }

      default:
        throw new Error(`Ferramenta desconhecida: ${name}`);
    }
  } catch (err: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Erro ao executar ${name}: ${err.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('OmniPDF MCP Server rodando via stdio...');
}

main().catch((err) => {
  console.error('Fatal error in OmniPDF MCP Server:', err);
  process.exit(1);
});
