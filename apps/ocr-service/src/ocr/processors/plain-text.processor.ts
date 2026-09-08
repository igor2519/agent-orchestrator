import { PermanentError } from '@app/messaging';
import { Injectable } from '@nestjs/common';

import { BaseOcrProcessor } from '../base-ocr-processor';
import { resolveContent } from '../document-content';

import type { OcrInput } from '../base-ocr-processor';
import type { OcrOutcome } from '@app/contracts';

/**
 * Reads plain-text uploads directly.
 *
 * Text needs no recognition, so running it through an OCR engine would only add
 * latency and introduce errors into content that is already exact - hence full
 * confidence.
 */
@Injectable()
export class PlainTextProcessor extends BaseOcrProcessor {
  readonly name = 'plain-text';

  supports(documentType: string): boolean {
    return documentType.toLowerCase() === 'text';
  }

  async extract(input: OcrInput): Promise<OcrOutcome> {
    const buffer = await resolveContent(input);
    const text = buffer.toString('utf8');

    if (text.trim().length === 0) {
      throw new PermanentError('Uploaded text file is empty', 'OCR_EMPTY_FILE');
    }

    return {
      engine: this.name,
      text,
      confidence: 1,
      pageCount: 1,
    };
  }
}
