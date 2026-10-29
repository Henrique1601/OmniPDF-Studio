import { createWorker, Worker } from 'tesseract.js';
import { DetectedTextItem } from '../types';

export interface OcrRecognitionOptions {
  lang?: string;
  level?: 'words' | 'lines';
  pdfWidth: number;
  pdfHeight: number;
  screenWidth: number;
  screenHeight: number;
  pageCanvas?: HTMLCanvasElement | null;
  onProgress?: (progress: number, status: string) => void;
}

interface ParsedOcrItem {
  text: string;
  bbox: { x0: number; y0: number; x1: number; y1: number };
  confidence: number;
}

class OcrServiceClass {
  private cachedWorker: Worker | null = null;
  private currentWorkerLang: string = '';

  /**
   * Obtém ou inicializa um worker do Tesseract.js com cache para alta performance (modo Web)
   */
  private async getWorker(lang: string = 'por', onProgress?: (p: number, s: string) => void): Promise<Worker> {
    if (this.cachedWorker && this.currentWorkerLang === lang) {
      return this.cachedWorker;
    }

    if (this.cachedWorker) {
      try {
        await this.cachedWorker.terminate();
      } catch (e) {
        console.warn('Erro ao encerrar worker anterior:', e);
      }
      this.cachedWorker = null;
    }

    onProgress?.(15, `Inicializando motor OCR offline (${lang.toUpperCase()})...`);
    const worker = await createWorker(lang);
    this.cachedWorker = worker;
    this.currentWorkerLang = lang;
    return worker;
  }

  /**
   * Extrai a cor média de fundo de uma região do canvas (para máscara de TrueEdit idêntica à cor do papel da foto)
   */
  public sampleBackgroundColor(
    canvas: HTMLCanvasElement | null,
    screenX: number,
    screenY: number,
    width: number,
    height: number
  ): { r: number; g: number; b: number } {
    if (!canvas) return { r: 1, g: 1, b: 1 }; // Default branco

    try {
      const ctx = canvas.getContext('2d');
      if (!ctx) return { r: 1, g: 1, b: 1 };

      // Amostrar pixels adjacentes fora da caixa do texto (2px acima e à esquerda)
      const sampleX = Math.max(0, Math.min(canvas.width - 1, Math.round(screenX - 3)));
      const sampleY = Math.max(0, Math.min(canvas.height - 1, Math.round(screenY - 3)));

      const imgData = ctx.getImageData(sampleX, sampleY, 3, 3);
      const data = imgData.data;

      let totalR = 0;
      let totalG = 0;
      let totalB = 0;
      let count = 0;

      for (let i = 0; i < data.length; i += 4) {
        // Ignora pixels muito escuros (texto/tinta)
        const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        if (lum > 140) {
          totalR += data[i];
          totalG += data[i + 1];
          totalB += data[i + 2];
          count++;
        }
      }

      if (count === 0) return { r: 1, g: 1, b: 1 };

      return {
        r: Number((totalR / count / 255).toFixed(3)),
        g: Number((totalG / count / 255).toFixed(3)),
        b: Number((totalB / count / 255).toFixed(3))
      };
    } catch (e) {
      return { r: 1, g: 1, b: 1 };
    }
  }

  /**
   * Reconhece texto em uma página digitalizada / foto de papel e converte para DetectedTextItem[] com coordenadas exatas
   */
  public async recognizeScannedPage(
    imageSource: string | HTMLCanvasElement,
    pageNumber: number,
    options: OcrRecognitionOptions
  ): Promise<DetectedTextItem[]> {
    const lang = options.lang || localStorage.getItem('omnipdf_ocr_lang') || 'por';
    const level = options.level || 'words';
    const onProgress = options.onProgress;

    const lines: ParsedOcrItem[] = [];
    const words: ParsedOcrItem[] = [];

    onProgress?.(20, 'Inicializando motor OCR para processamento inteligente...');
    const worker = await this.getWorker(lang, onProgress);

    onProgress?.(45, 'Analisando layout, linhas e palavras da imagem/digitalização...');
    const ret = await worker.recognize(imageSource, {}, { blocks: true });
    const pageData: any = ret.data;
    const blocks = pageData.blocks || [];

    for (const b of blocks) {
      for (const p of b.paragraphs || []) {
        for (const l of p.lines || []) {
          const lText = l.text ? l.text.trim() : '';
          if (lText) {
            lines.push({ text: lText, bbox: l.bbox, confidence: l.confidence });
          }
          for (const wd of l.words || []) {
            const wText = wd.text ? wd.text.trim() : '';
            if (wText) {
              words.push({ text: wText, bbox: wd.bbox, confidence: wd.confidence });
            }
          }
        }
      }
    }

    onProgress?.(85, 'Mapeando coordenadas milimétricas para TrueEdit...');

    // Obter dimensões reais da imagem renderizada
    let imgW = options.screenWidth;
    let imgH = options.screenHeight;
    if (typeof imageSource !== 'string' && imageSource.width && imageSource.height) {
      imgW = imageSource.width;
      imgH = imageSource.height;
    }

    const ratioScreenX = options.screenWidth / imgW;
    const ratioScreenY = options.screenHeight / imgH;
    const ratioPdfX = options.pdfWidth / imgW;
    const ratioPdfY = options.pdfHeight / imgH;

    const detectedItems: DetectedTextItem[] = [];
    const targetItems = level === 'lines' ? lines : words;

    targetItems.forEach((item, idx) => {
      const text = item.text?.trim();
      if (!text || text.length === 0) return;

      const { x0, y0, x1, y1 } = item.bbox;
      const boxW = Math.max(x1 - x0, 8);
      const boxH = Math.max(y1 - y0, 8);

      const screenLeft = x0 * ratioScreenX;
      const screenTop = y0 * ratioScreenY;
      const screenWidth = boxW * ratioScreenX;
      const screenHeight = boxH * ratioScreenY;

      const pdfX = x0 * ratioPdfX;
      const pdfWidth = boxW * ratioPdfX;
      const pdfHeight = boxH * ratioPdfY;
      // PDF Y: origem no canto inferior esquerdo (0 no rodapé)
      const pdfY = options.pdfHeight - (y1 * ratioPdfY);
      const fontSize = Math.max(8, Math.round(pdfHeight * 0.8));

      const sampledBgColor = this.sampleBackgroundColor(
        options.pageCanvas || null,
        screenLeft,
        screenTop,
        screenWidth,
        screenHeight
      );

      detectedItems.push({
        id: `ocr-${level === 'lines' ? 'line' : 'word'}-${pageNumber}-${idx}`,
        str: text,
        pdfX,
        pdfY,
        pdfWidth,
        pdfHeight,
        fontSize,
        screenLeft,
        screenTop,
        screenWidth,
        screenHeight,
        isOcr: true,
        confidence: item.confidence,
        sampledBgColor
      });
    });

    onProgress?.(100, `OCR concluído! ${detectedItems.length} blocos de texto prontos para TrueEdit.`);
    return detectedItems;
  }
}

export const OCRService = new OcrServiceClass();
