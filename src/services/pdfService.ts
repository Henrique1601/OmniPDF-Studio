import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

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
   * Utilitário para criar Blob seguro sem erros de tipo
   */
  static createBlob(bytes: Uint8Array, mimeType: string = 'application/pdf'): Blob {
    return new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
  }
}
