import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { DetectedTextItem, TextEditItem } from '../types';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export class PDFService {
  /**
   * Obtém a contagem de páginas de um documento PDF
   */
  static async getPageCount(data: ArrayBuffer): Promise<number> {
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    return pdfDoc.getPageCount();
  }

  /**
   * Renderiza uma página específica em um Canvas HTML
   */
  static async renderPageToCanvas(
    data: ArrayBuffer,
    pageNumber: number,
    canvas: HTMLCanvasElement,
    scale: number = 1.0,
    rotation: number = 0
  ): Promise<{ width: number; height: number }> {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data.slice(0)) });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNumber);

    const viewport = page.getViewport({ scale, rotation });
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível obter contexto 2D');

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };

    await page.render(renderContext).promise;
    return { width: viewport.width, height: viewport.height };
  }

  /**
   * Renderiza uma página e exporta como imagem (PNG ou JPEG)
   */
  static async exportPageAsImage(
    data: ArrayBuffer,
    pageNumber: number,
    format: 'image/png' | 'image/jpeg' = 'image/png',
    quality: number = 0.95,
    scale: number = 2.0
  ): Promise<string> {
    const canvas = document.createElement('canvas');
    await this.renderPageToCanvas(data, pageNumber, canvas, scale);
    return canvas.toDataURL(format, quality);
  }

  /**
   * Junta (Merge) múltiplos PDFs em um único documento
   */
  static async mergePdfs(pdfBuffers: ArrayBuffer[]): Promise<Uint8Array> {
    const mergedPdf = await PDFDocument.create();

    for (const buffer of pdfBuffers) {
      const doc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const copiedPages = await mergedPdf.copyPages(doc, doc.getPageIndices());
      for (const page of copiedPages) {
        mergedPdf.addPage(page);
      }
    }

    return await mergedPdf.save({ useObjectStreams: true });
  }

  /**
   * Divide (Split) um PDF extraindo páginas específicas
   */
  static async splitPdf(
    data: ArrayBuffer,
    pageIndexes: number[] // 0-indexed
  ): Promise<Uint8Array> {
    const sourcePdf = await PDFDocument.load(data, { ignoreEncryption: true });
    const newPdf = await PDFDocument.create();

    const validIndices = pageIndexes.filter((idx) => idx >= 0 && idx < sourcePdf.getPageCount());
    const copiedPages = await newPdf.copyPages(sourcePdf, validIndices);

    for (const page of copiedPages) {
      newPdf.addPage(page);
    }

    return await newPdf.save({ useObjectStreams: true });
  }

  /**
   * Reorganiza páginas (reordena, rotaciona e exclui)
   */
  static async organizePdf(
    data: ArrayBuffer,
    orderedPageConfig: { originalIndex: number; rotation: number }[]
  ): Promise<Uint8Array> {
    const sourcePdf = await PDFDocument.load(data, { ignoreEncryption: true });
    const newPdf = await PDFDocument.create();

    for (const item of orderedPageConfig) {
      const [copiedPage] = await newPdf.copyPages(sourcePdf, [item.originalIndex]);
      if (item.rotation !== 0) {
        const currentRotation = copiedPage.getRotation().angle;
        copiedPage.setRotation(degrees((currentRotation + item.rotation) % 360));
      }
      newPdf.addPage(copiedPage);
    }

    return await newPdf.save({ useObjectStreams: true });
  }

  /**
   * Adiciona Marca d'Água de texto em todas as páginas
   */
  static async addWatermark(
    data: ArrayBuffer,
    text: string,
    options: {
      fontSize?: number;
      opacity?: number;
      colorHex?: string;
      rotationDeg?: number;
    } = {}
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    const fontSize = options.fontSize || 48;
    const opacity = options.opacity !== undefined ? options.opacity : 0.3;
    const rotDeg = options.rotationDeg !== undefined ? options.rotationDeg : 45;

    for (const page of pages) {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      page.drawText(text, {
        x: width / 2 - textWidth / 2,
        y: height / 2 - textHeight / 2,
        size: fontSize,
        font: font,
        color: rgb(0.8, 0.1, 0.2),
        opacity: opacity,
        rotate: degrees(rotDeg),
      });
    }

    return await pdfDoc.save({ useObjectStreams: true });
  }

  /**
   * Compacta PDF recriando a árvore de objetos e ativando Object Streams
   */
  static async compressPdf(data: ArrayBuffer): Promise<Uint8Array> {
    const sourcePdf = await PDFDocument.load(data, { ignoreEncryption: true });
    const newPdf = await PDFDocument.create();

    const pageIndices = sourcePdf.getPageIndices();
    const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);

    for (const page of copiedPages) {
      newPdf.addPage(page);
    }

    // save with maximum compression flags
    return await newPdf.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 50,
    });
  }

  /**
   * Converte uma lista de imagens em um documento PDF
   */
  static async imagesToPdf(
    images: { data: ArrayBuffer; type: 'image/png' | 'image/jpeg' }[]
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();

    for (const img of images) {
      let embeddedImage;
      if (img.type === 'image/png') {
        embeddedImage = await pdfDoc.embedPng(img.data);
      } else {
        embeddedImage = await pdfDoc.embedJpg(img.data);
      }

      const { width, height } = embeddedImage.scale(1.0);
      const page = pdfDoc.addPage([width, height]);
      page.drawImage(embeddedImage, {
        x: 0,
        y: 0,
        width,
        height,
      });
    }

    return await pdfDoc.save({ useObjectStreams: true });
  }

  /**
   * Adiciona anotação de texto ou desenho a uma página do PDF
   */
  static async addAnnotations(
    data: ArrayBuffer,
    annotations: {
      pageIndex: number;
      texts?: { text: string; x: number; y: number; size: number; colorHex: string }[];
    }[]
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    for (const ann of annotations) {
      const page = pages[ann.pageIndex];
      if (!page) continue;

      if (ann.texts) {
        for (const t of ann.texts) {
          page.drawText(t.text, {
            x: t.x,
            y: t.y,
            size: t.size,
            font,
            color: rgb(0.1, 0.1, 0.1),
          });
        }
      }
    }

    return await pdfDoc.save({ useObjectStreams: true });
  }

  /**
   * Extrai todos os blocos de texto detectados em uma página com coordenadas PDF e Screen
   */
  static async extractPageTextItems(
    data: ArrayBuffer,
    pageNumber: number,
    scale: number = 1.0
  ): Promise<DetectedTextItem[]> {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data.slice(0)) });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const viewport = page.getViewport({ scale });

    const items: DetectedTextItem[] = [];
    for (let i = 0; i < textContent.items.length; i++) {
      const item: any = textContent.items[i];
      if (!item.str || item.str.trim() === '') continue;

      const pdfX = item.transform[4];
      const pdfY = item.transform[5];
      const fontSize = Math.sqrt(item.transform[0] * item.transform[0] + item.transform[1] * item.transform[1]) || 12;
      const pdfWidth = item.width || (fontSize * item.str.length * 0.55);
      const pdfHeight = item.height || fontSize;

      const rect: [number, number, number, number] = [pdfX, pdfY, pdfX + pdfWidth, pdfY + pdfHeight];
      const [vX1, vY1, vX2, vY2] = viewport.convertToViewportRectangle(rect);
      const screenLeft = Math.min(vX1, vX2);
      const screenTop = Math.min(vY1, vY2);
      const screenWidth = Math.max(Math.abs(vX2 - vX1), 10);
      const screenHeight = Math.max(Math.abs(vY2 - vY1), 10);

      items.push({
        id: `txt-${pageNumber}-${i}`,
        str: item.str,
        pdfX,
        pdfY,
        pdfWidth,
        pdfHeight,
        fontSize,
        screenLeft,
        screenTop,
        screenWidth,
        screenHeight,
      });
    }

    return items;
  }

  /**
   * Aplica alterações diretas de texto no PDF (substituição / TrueEdit)
   */
  static async applyTextEdits(
    data: ArrayBuffer,
    edits: TextEditItem[]
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    for (const edit of edits) {
      const pageIndex = edit.pageNumber - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) continue;
      const page = pages[pageIndex];

      const padX = 1.5;
      const padY = 2;
      const newTextWidth = font.widthOfTextAtSize(edit.newText, edit.fontSize);
      const maskWidth = Math.max(edit.pdfWidth, newTextWidth) + padX * 2;
      const maskHeight = Math.max(edit.pdfHeight, edit.fontSize) + padY * 2;

      // 1. Cobrir o texto antigo com uma máscara sólida limpa (geralmente branca ou cor de fundo)
      const bg = edit.bgColor || { r: 1, g: 1, b: 1 };
      page.drawRectangle({
        x: edit.pdfX - padX,
        y: edit.pdfY - padY,
        width: maskWidth,
        height: maskHeight,
        color: rgb(bg.r, bg.g, bg.b),
      });

      // 2. Gravar o novo texto na posição exata
      const fg = edit.textColor || { r: 0, g: 0, b: 0 };
      page.drawText(edit.newText, {
        x: edit.pdfX,
        y: edit.pdfY,
        size: edit.fontSize,
        font,
        color: rgb(fg.r, fg.g, fg.b),
      });
    }

    return await pdfDoc.save({ useObjectStreams: true });
  }

  /**
   * Adiciona numeração automática de páginas ou cabeçalho/rodapé
   */
  static async addPageNumbers(
    data: ArrayBuffer,
    options: {
      format?: 'page-of-total' | 'simple' | 'custom';
      position?: 'bottom-center' | 'bottom-right' | 'bottom-left' | 'top-center' | 'top-right' | 'top-left';
      startFromPage?: number;
      fontSize?: number;
      margin?: number;
      prefix?: string;
    } = {}
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();
    const total = pages.length;
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const startPage = Math.max(1, options.startFromPage || 1);
    const fontSize = options.fontSize || 10;
    const margin = options.margin || 30;
    const pos = options.position || 'bottom-center';

    for (let i = startPage - 1; i < total; i++) {
      const page = pages[i];
      const { width, height } = page.getSize();
      const pageNum = i + 1;

      let text = `${pageNum}`;
      if (options.format === 'page-of-total') {
        text = `Página ${pageNum} de ${total}`;
      } else if (options.format === 'simple') {
        text = `${pageNum}`;
      } else if (options.prefix) {
        text = `${options.prefix} ${pageNum}`;
      }

      const textWidth = font.widthOfTextAtSize(text, fontSize);
      let x = width / 2 - textWidth / 2;
      let y = margin;

      if (pos === 'bottom-left') {
        x = margin;
        y = margin;
      } else if (pos === 'bottom-right') {
        x = width - margin - textWidth;
        y = margin;
      } else if (pos === 'bottom-center') {
        x = width / 2 - textWidth / 2;
        y = margin;
      } else if (pos === 'top-left') {
        x = margin;
        y = height - margin - fontSize;
      } else if (pos === 'top-center') {
        x = width / 2 - textWidth / 2;
        y = height - margin - fontSize;
      } else if (pos === 'top-right') {
        x = width - margin - textWidth;
        y = height - margin - fontSize;
      }

      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    return await pdfDoc.save({ useObjectStreams: true });
  }

  /**
   * Grava uma assinatura manuscrita (imagem PNG) na página do PDF
   */
  static async addSignature(
    data: ArrayBuffer,
    signaturePngDataUrl: string,
    targetPage: number,
    options: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();
    const pageIndex = targetPage - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) {
      throw new Error('Página inválida para assinatura.');
    }
    const page = pages[pageIndex];

    const base64Data = signaturePngDataUrl.replace(/^data:image\/\w+;base64,/, '');
    const binaryStr = atob(base64Data);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const embeddedPng = await pdfDoc.embedPng(bytes);
    page.drawImage(embeddedPng, {
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
    });

    return await pdfDoc.save({ useObjectStreams: true });
  }

  /**
   * Adiciona marcações de marca-texto semi-transparentes
   */
  static async addHighlights(
    data: ArrayBuffer,
    highlights: {
      pageNumber: number;
      x: number;
      y: number;
      width: number;
      height: number;
      colorHex: string;
      opacity?: number;
    }[]
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();

    for (const hl of highlights) {
      const pIndex = hl.pageNumber - 1;
      if (pIndex < 0 || pIndex >= pages.length) continue;
      const page = pages[pIndex];

      const cleanHex = hl.colorHex.replace('#', '');
      const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
      const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
      const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

      page.drawRectangle({
        x: hl.x,
        y: hl.y,
        width: hl.width,
        height: hl.height,
        color: rgb(r, g, b),
        opacity: hl.opacity !== undefined ? hl.opacity : 0.35,
      });
    }

    return await pdfDoc.save({ useObjectStreams: true });
  }

  /**
   * Utilitário para criar Blob seguro sem erros de tipo
   */
  static createBlob(bytes: Uint8Array, mimeType: string = 'application/pdf'): Blob {
    return new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
  }
}
