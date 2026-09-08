import { PermanentError } from '@app/messaging';
import { Injectable } from '@nestjs/common';
import { PDFParse } from 'pdf-parse';

import { BaseOcrProcessor } from '../base-ocr-processor';
import { resolveContent } from '../document-content';

import type { OcrInput } from '../base-ocr-processor';
import type { OcrOutcome } from '@app/contracts';

/**
 * Extracts the text layer from a PDF.
 *
 * Most PDFs are generated rather than scanned and already carry their text, which
 * is exact and far cheaper than recognition. A PDF with no text layer is a scan;
 * that is reported permanently rather than retried, since rasterising and running
 * Tesseract over it is a different pipeline this engine does not implement.
 */
@Injectable()
export class PdfTextProcessor extends BaseOcrProcessor {
  readonly name = 'pdf-text';

  supports(documentType: string): boolean {
    return documentType.toLowerCase() === 'pdf';
  }

  async extract(input: OcrInput): Promise<OcrOutcome> {
    const buffer = await resolveContent(input);
    const parser = new PDFParse({ data: new Uint8Array(buffer) });

    try {
      const result = await parser.getText();
      const text = result.text.trim();

      if (text.length === 0) {
        throw new PermanentError(
          'PDF contains no extractable text; it is likely a scan',
          'OCR_PDF_NO_TEXT_LAYER',
        );
      }

      return {
        engine: this.name,
        text,
        confidence: 1,
        pageCount: result.pages?.length ?? 1,
      };
    } catch (error) {
      if (error instanceof PermanentError) {
        throw error;
      }

      // A malformed or password-protected PDF will not parse on a retry either.
      throw new PermanentError(
        `Could not read PDF ${input.documentReference}`,
        'OCR_PDF_UNREADABLE',
        error,
      );
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }
}
