import { Injectable } from '@nestjs/common';

import { BaseDocumentValidator } from '../base-document-validator';

import type { ValidationInput } from '../base-document-validator';
import type { ValidationIssue } from '@app/contracts';

/** Rejects results that carry no usable text or too low a confidence to trust. */
@Injectable()
export class ExtractedTextValidator extends BaseDocumentValidator {
  readonly name = 'extracted-text';

  private static readonly MIN_CONFIDENCE = 0.75;

  supports(): boolean {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/require-await -- implements an intentionally async contract
  async validate({ ocr }: ValidationInput): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    if (ocr.text.trim().length === 0) {
      issues.push({
        validator: this.name,
        code: 'EMPTY_TEXT',
        message: 'OCR produced no text',
      });
    }

    if (ocr.confidence < ExtractedTextValidator.MIN_CONFIDENCE) {
      issues.push({
        validator: this.name,
        code: 'LOW_CONFIDENCE',
        message: `OCR confidence ${ocr.confidence} is below ${ExtractedTextValidator.MIN_CONFIDENCE}`,
      });
    }

    return issues;
  }
}
