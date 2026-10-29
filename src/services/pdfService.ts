import { OCRService } from './ocrService';
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

    // Parse hex color to rgb
    const hexColor = (options.colorHex || '#DC2626').replace('#', '');
    const r = parseInt(hexColor.substring(0, 2), 16) / 255 || 0.8;
    const g = parseInt(hexColor.substring(2, 4), 16) / 255 || 0.1;
    const b = parseInt(hexColor.substring(4, 6), 16) / 255 || 0.2;
    const textColor = rgb(r, g, b);

    // Calculate rotation in radians for center anchoring
    const rad = (rotDeg * Math.PI) / 180;
    const cosTheta = Math.cos(rad);
    const sinTheta = Math.sin(rad);

    for (const page of pages) {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const textHeight = font.heightAtSize(fontSize);

      // Center-anchored rotation positioning
      const originX = width / 2 - (textWidth / 2 * cosTheta - textHeight / 2 * sinTheta);
      const originY = height / 2 - (textWidth / 2 * sinTheta + textHeight / 2 * cosTheta);

      page.drawText(text, {
        x: originX,
        y: originY,
        size: fontSize,
        font: font,
        color: textColor,
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

  /**
   * Aplica modificações ao vivo (Adobe Acrobat Style):
   * Textos livres, Marca-Texto, Tarjas pretas de censura, Assinaturas e Marcas d'água combinadas.
   */
  static async applyLiveModifications(
    data: ArrayBuffer,
    modifications: {
      texts?: { pageNumber: number; text: string; x: number; y: number; size: number; colorHex: string }[];
      highlights?: { pageNumber: number; x: number; y: number; width: number; height: number; colorHex: string; opacity?: number }[];
      redactions?: { pageNumber: number; x: number; y: number; width: number; height: number }[];
      signatures?: { pageNumber: number; dataUrl: string; x: number; y: number; width: number; height: number }[];
      watermark?: { enabled: boolean; text: string; fontSize: number; opacity: number; colorHex: string; rotationDeg: number };
    }
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    const hexToRgbHelper = (hex: string) => {
      const clean = (hex || '#000000').replace('#', '');
      const r = parseInt(clean.substring(0, 2), 16) / 255 || 0;
      const g = parseInt(clean.substring(2, 4), 16) / 255 || 0;
      const b = parseInt(clean.substring(4, 6), 16) / 255 || 0;
      return rgb(r, g, b);
    };

    // 1. Apply Highlights (rectangles with opacity)
    if (modifications.highlights) {
      for (const h of modifications.highlights) {
        const pageIndex = h.pageNumber - 1;
        if (pageIndex >= 0 && pageIndex < pages.length) {
          pages[pageIndex].drawRectangle({
            x: h.x,
            y: h.y,
            width: h.width,
            height: h.height,
            color: hexToRgbHelper(h.colorHex),
            opacity: h.opacity !== undefined ? h.opacity : 0.4,
          });
        }
      }
    }

    // 2. Apply Redactions (solid black censorship boxes)
    if (modifications.redactions) {
      for (const r of modifications.redactions) {
        const pageIndex = r.pageNumber - 1;
        if (pageIndex >= 0 && pageIndex < pages.length) {
          pages[pageIndex].drawRectangle({
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
            color: rgb(0, 0, 0),
            opacity: 1.0,
          });
        }
      }
    }

    // 3. Apply Free Text Insertions
    if (modifications.texts) {
      for (const t of modifications.texts) {
        const pageIndex = t.pageNumber - 1;
        if (pageIndex >= 0 && pageIndex < pages.length && t.text.trim()) {
          pages[pageIndex].drawText(t.text, {
            x: t.x,
            y: t.y,
            size: t.size || 14,
            font: fontRegular,
            color: hexToRgbHelper(t.colorHex || '#000000'),
          });
        }
      }
    }

    // 4. Apply Signatures (PNG images)
    if (modifications.signatures) {
      for (const s of modifications.signatures) {
        const pageIndex = s.pageNumber - 1;
        if (pageIndex >= 0 && pageIndex < pages.length && s.dataUrl) {
          try {
            const base64Data = s.dataUrl.replace(/^data:image\/\w+;base64,/, '');
            const binaryStr = atob(base64Data);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
            const embedded = await pdfDoc.embedPng(bytes);
            pages[pageIndex].drawImage(embedded, {
              x: s.x,
              y: s.y,
              width: s.width,
              height: s.height,
            });
          } catch (err) {
            console.error('Erro ao embutir assinatura:', err);
          }
        }
      }
    }

    // 5. Apply Watermark across all pages if enabled
    if (modifications.watermark?.enabled && modifications.watermark.text.trim()) {
      const wm = modifications.watermark;
      const rad = (wm.rotationDeg * Math.PI) / 180;
      const cosTheta = Math.cos(rad);
      const sinTheta = Math.sin(rad);
      const wmColor = hexToRgbHelper(wm.colorHex || '#DC2626');

      for (const page of pages) {
        const { width, height } = page.getSize();
        const textWidth = fontBold.widthOfTextAtSize(wm.text, wm.fontSize);
        const textHeight = fontBold.heightAtSize(wm.fontSize);

        const originX = width / 2 - (textWidth / 2 * cosTheta - textHeight / 2 * sinTheta);
        const originY = height / 2 - (textWidth / 2 * sinTheta + textHeight / 2 * cosTheta);

        page.drawText(wm.text, {
          x: originX,
          y: originY,
          size: wm.fontSize,
          font: fontBold,
          color: wmColor,
          opacity: wm.opacity,
          rotate: degrees(wm.rotationDeg),
        });
      }
    }

    return await pdfDoc.save({ useObjectStreams: true });
  }

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
    const styles = (textContent as any).styles || {};

    for (let i = 0; i < textContent.items.length; i++) {
      const item: any = textContent.items[i];
      if (!item.str || item.str.trim() === '') continue;

      const pdfX = item.transform[4];
      const pdfY = item.transform[5];
      const fontSize = Math.sqrt(item.transform[0] * item.transform[0] + item.transform[1] * item.transform[1]) || 12;
      const pdfWidth = item.width || (fontSize * item.str.length * 0.55);
      const pdfHeight = item.height || fontSize;

      const rawFontName = (item.fontName || '').toLowerCase();
      const styleObj = styles[item.fontName] || {};
      const styleFamily = (styleObj.fontFamily || '').toLowerCase();

      let fontFamily: 'sans' | 'serif' | 'mono' = 'sans';
      if (
        styleFamily.includes('serif') ||
        rawFontName.includes('times') ||
        rawFontName.includes('roman') ||
        rawFontName.includes('georgia') ||
        rawFontName.includes('garamond') ||
        rawFontName.includes('minion')
      ) {
        fontFamily = 'serif';
      } else if (
        styleFamily.includes('mono') ||
        rawFontName.includes('courier') ||
        rawFontName.includes('consolas') ||
        rawFontName.includes('monospace')
      ) {
        fontFamily = 'mono';
      }

      const isBold =
        rawFontName.includes('bold') ||
        rawFontName.includes('black') ||
        rawFontName.includes('heavy') ||
        rawFontName.includes('bolder');
      const isItalic = rawFontName.includes('italic') || rawFontName.includes('oblique');

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
        fontFamily,
        isBold,
        isItalic,
      });
    }

    return items;
  }

  /**
   * Aplica alterações diretas de texto no PDF (substituição / TrueEdit)
   */
  
  /**
   * Converte uma imagem única (foto de papel, digitalização) diretamente em PDF de alta resolução
   */
  static async convertImageToPdf(
    imageData: ArrayBuffer,
    fileName: string = 'documento.jpg'
  ): Promise<Uint8Array> {
    const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    const isPng = ext === 'png';
    const isJpg = ext === 'jpg' || ext === 'jpeg';

    if (isPng || isJpg) {
      try {
        return await this.imagesToPdf([{ data: imageData, type: isPng ? 'image/png' : 'image/jpeg' }]);
      } catch (e) {
        console.warn('Erro ao embutir direto, convertendo via canvas:', e);
      }
    }

    return new Promise((resolve, reject) => {
      const blob = new Blob([imageData]);
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = async () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context não disponível'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(async (pngBlob) => {
          if (!pngBlob) {
            reject(new Error('Falha ao converter imagem'));
            return;
          }
          const buffer = await pngBlob.arrayBuffer();
          const pdfBytes = await this.imagesToPdf([{ data: buffer, type: 'image/png' }]);
          resolve(pdfBytes);
        }, 'image/png', 1.0);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Não foi possível carregar a imagem'));
      };
      img.src = url;
    });
  }

  /**
   * Extrai blocos de texto da página. Se for uma digitalização ou foto (0 itens nativos),
   * aciona o OCR inteligente offline com Tesseract para mapear cada palavra/linha milimetricamente.
   */
  static async extractPageTextWithOcrFallback(
    data: ArrayBuffer,
    pageNumber: number,
    scale: number = 1.0,
    options?: {
      forceOcr?: boolean;
      lang?: string;
      level?: 'words' | 'lines';
      pageCanvas?: HTMLCanvasElement | null;
      onProgress?: (progress: number, status: string) => void;
    }
  ): Promise<{ items: DetectedTextItem[]; isScanned: boolean }> {
    // 1. Tentar primeiro texto nativo se não for forçado
    if (!options?.forceOcr) {
      try {
        const nativeItems = await this.extractPageTextItems(data, pageNumber, scale);
        if (nativeItems.length > 0) {
          return { items: nativeItems, isScanned: false };
        }
      } catch (err) {
        console.warn('Erro ao extrair texto nativo:', err);
      }
    }

    // 2. Documento é uma digitalização / foto de papel!
    options?.onProgress?.(15, 'Digitalização ou foto detectada. Renderizando alta definição para OCR...');

    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data.slice(0)) });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const baseViewport = page.getViewport({ scale: 1.0 });

    const ocrScale = 2.0;
    const ocrViewport = page.getViewport({ scale: ocrScale });
    const ocrCanvas = document.createElement('canvas');
    ocrCanvas.width = ocrViewport.width;
    ocrCanvas.height = ocrViewport.height;
    const ocrCtx = ocrCanvas.getContext('2d');

    if (!ocrCtx) {
      throw new Error('Não foi possível obter contexto 2D para renderização de OCR.');
    }

    await page.render({
      canvasContext: ocrCtx,
      viewport: ocrViewport
    }).promise;

    const ocrItems = await OCRService.recognizeScannedPage(
      ocrCanvas,
      pageNumber,
      {
        lang: options?.lang,
        level: options?.level || 'words',
        pdfWidth: baseViewport.width,
        pdfHeight: baseViewport.height,
        screenWidth: viewport.width,
        screenHeight: viewport.height,
        pageCanvas: options?.pageCanvas || ocrCanvas,
        onProgress: options?.onProgress
      }
    );

    return { items: ocrItems, isScanned: true };
  }

  static async applyTextEdits(
    data: ArrayBuffer,
    edits: TextEditItem[]
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });

    // Embed the standard typography suites to accurately reproduce any PDF font
    const fonts = {
      sans: await pdfDoc.embedFont(StandardFonts.Helvetica),
      sansBold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
      sansItalic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique),
      sansBoldItalic: await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique),
      serif: await pdfDoc.embedFont(StandardFonts.TimesRoman),
      serifBold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
      serifItalic: await pdfDoc.embedFont(StandardFonts.TimesRomanItalic),
      serifBoldItalic: await pdfDoc.embedFont(StandardFonts.TimesRomanBoldItalic),
      mono: await pdfDoc.embedFont(StandardFonts.Courier),
      monoBold: await pdfDoc.embedFont(StandardFonts.CourierBold),
      monoItalic: await pdfDoc.embedFont(StandardFonts.CourierOblique),
      monoBoldItalic: await pdfDoc.embedFont(StandardFonts.CourierBoldOblique),
    };

    const pages = pdfDoc.getPages();

    for (const edit of edits) {
      const pageIndex = edit.pageNumber - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) continue;
      const page = pages[pageIndex];

      // Select matching font family and style
      let font = fonts.sans;
      const fam = edit.fontFamily || 'sans';
      if (fam === 'serif') {
        font = edit.isBold && edit.isItalic ? fonts.serifBoldItalic : edit.isBold ? fonts.serifBold : edit.isItalic ? fonts.serifItalic : fonts.serif;
      } else if (fam === 'mono') {
        font = edit.isBold && edit.isItalic ? fonts.monoBoldItalic : edit.isBold ? fonts.monoBold : edit.isItalic ? fonts.monoItalic : fonts.mono;
      } else {
        font = edit.isBold && edit.isItalic ? fonts.sansBoldItalic : edit.isBold ? fonts.sansBold : edit.isItalic ? fonts.sansItalic : fonts.sans;
      }

      // 1. Cover original text at its original position so old letters are fully erased
      const origX = edit.origPdfX !== undefined ? edit.origPdfX : edit.pdfX;
      const origY = edit.origPdfY !== undefined ? edit.origPdfY : edit.pdfY;
      const origW = edit.origPdfWidth || edit.pdfWidth;
      const origH = edit.origPdfHeight || edit.pdfHeight;

      const padX = 2;
      const padY = 2;
      const maskWidth = origW + padX * 2;
      const maskHeight = Math.max(origH, edit.fontSize) + padY * 2;

      const bg = edit.bgColor || { r: 1, g: 1, b: 1 };
      page.drawRectangle({
        x: origX - padX,
        y: origY - padY,
        width: maskWidth,
        height: maskHeight,
        color: rgb(bg.r, bg.g, bg.b),
      });

      // 2. Write new text at the new (moved / aligned) position
      const fg = edit.textColor || { r: 0, g: 0, b: 0 };
      if (edit.newText && edit.newText.trim() !== '') {
        page.drawText(edit.newText, {
          x: edit.pdfX,
          y: edit.pdfY,
          size: edit.fontSize,
          font,
          color: rgb(fg.r, fg.g, fg.b),
        });
      }
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
   * Extrai todo o texto do documento estruturado por páginas
   */
  static async extractAllDocumentText(data: ArrayBuffer): Promise<{ pageNumber: number; text: string }[]> {
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(data.slice(0)) });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const results: { pageNumber: number; text: string }[] = [];

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => item.str || '')
        .join(' ');
      results.push({ pageNumber: i, text: pageText.trim() });
    }

    return results;
  }

  /**
   * Aplica censura/redação permanente em áreas confidenciais (CPF, senhas, etc.)
   */
  static async applyRedactions(
    data: ArrayBuffer,
    redactions: {
      pageNumber: number;
      x: number;
      y: number;
      width: number;
      height: number;
      overlayText?: string;
    }[]
  ): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.load(data, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    for (const r of redactions) {
      const pIndex = r.pageNumber - 1;
      if (pIndex < 0 || pIndex >= pages.length) continue;
      const page = pages[pIndex];

      page.drawRectangle({
        x: r.x - 2,
        y: r.y - 2,
        width: r.width + 4,
        height: r.height + 4,
        color: rgb(0, 0, 0),
      });

      if (r.overlayText) {
        const text = r.overlayText;
        const fontSize = Math.min(8, Math.max(5, r.height * 0.5));
        const textWidth = font.widthOfTextAtSize(text, fontSize);
        page.drawText(text, {
          x: r.x + (r.width - textWidth) / 2,
          y: r.y + (r.height - fontSize) / 2,
          size: fontSize,
          font,
          color: rgb(1, 1, 1),
        });
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
