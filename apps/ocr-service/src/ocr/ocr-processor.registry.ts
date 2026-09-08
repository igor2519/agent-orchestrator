import { PermanentError } from '@app/messaging';
import { Inject, Injectable } from '@nestjs/common';

import { BaseOcrProcessor } from './base-ocr-processor';
import { OCR_PROCESSORS } from './ocr.tokens';

/**
 * Resolves the OCR engine for a document type.
 *
 * Registration order is precedence: the first engine that claims support wins,
 * so a specialised engine can be placed ahead of a general fallback.
 */
@Injectable()
export class OcrProcessorRegistry {
  constructor(@Inject(OCR_PROCESSORS) private readonly processors: BaseOcrProcessor[]) {}

  resolve(documentType: string): BaseOcrProcessor {
    const processor = this.processors.find((candidate) => candidate.supports(documentType));

    if (!processor) {
      // No engine will ever appear for this type mid-flight, so this is permanent
      // and must not consume retry attempts.
      throw new PermanentError(
        `No OCR processor supports document type "${documentType}"`,
        'NO_OCR_PROCESSOR',
      );
    }

    return processor;
  }

  get registered(): string[] {
    return this.processors.map((processor) => processor.name);
  }
}
