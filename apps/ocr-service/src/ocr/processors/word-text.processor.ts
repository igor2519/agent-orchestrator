import { PermanentError } from '@app/messaging';
import { Injectable } from '@nestjs/common';
import { extractRawText } from 'mammoth';

import { BaseOcrProcessor } from '../base-ocr-processor';
import { resolveContent } from '../document-content';

import type { OcrInput } from '../base-ocr-processor';
import type { OcrOutcome } from '@app/contracts';

/**
 * Extracts text from a Word document.
 *
 * `extractRawText` is used rather than the HTML conversion on purpose: the pipeline
 * rejects documents containing HTML, so producing HTML here would fail every Word
 * upload downstream.
 */
@Injectable()
export class WordTextProcessor extends BaseOcrProcessor {
  readonly name = 'word-text';

  supports(documentType: string): boolean {
    return documentType.toLowerCase() === 'word';
  }

  async extract(input: OcrInput): Promise<OcrOutcome> {
    const buffer = await resolveContent(input);

    try {
      const { value } = await extractRawText({ buffer });
      const text = value.trim();

      if (text.length === 0) {
        throw new PermanentError('Word document contains no text', 'OCR_EMPTY_FILE');
      }

      return { engine: this.name, text, confidence: 1, pageCount: 1 };
    } catch (error) {
      if (error instanceof PermanentError) {
        throw error;
      }

      // Legacy .doc is a different container that mammoth cannot read.
      throw new PermanentError(
        `Could not read Word document ${input.documentReference}; only .docx is supported`,
        'OCR_WORD_UNREADABLE',
        error,
      );
    }
  }
}
