/* eslint-disable @typescript-eslint/require-await -- these implement an
   intentionally async contract; the deterministic stand-ins perform no I/O */
import { createHash } from 'node:crypto';

import { PermanentError, TransientError } from '@app/messaging';
import { Injectable } from '@nestjs/common';

import { BaseDocumentProcessor } from '../base-document-processor';

import type { ProcessingInput, ProcessingOutcome } from '../base-document-processor';

/**
 * Deterministic stand-in for real processing.
 *
 * Behaviour is a pure function of the document reference and the attempt number,
 * so every branch of the retry logic is reproducible:
 *
 *   bucket 0-14 -> succeeds immediately
 *   bucket 15-17 -> fails transiently until attempt 3, then succeeds
 *   bucket 18-19 -> fails permanently
 */
@Injectable()
export class DeterministicDocumentProcessor extends BaseDocumentProcessor {
  readonly name = 'deterministic-processor';

  private static readonly SUCCEEDS_FROM_ATTEMPT = 3;

  supports(): boolean {
    return true;
  }

  async process(input: ProcessingInput): Promise<ProcessingOutcome> {
    const digest = createHash('sha256').update(input.documentReference).digest();
    const bucket = digest[3] % 20;

    if (bucket >= 18) {
      throw new PermanentError(
        `Document ${input.documentReference} cannot be processed`,
        'UNSUPPORTED_CONTENT',
      );
    }

    if (bucket >= 15 && input.attempt < DeterministicDocumentProcessor.SUCCEEDS_FROM_ATTEMPT) {
      throw new TransientError(
        `Downstream dependency unavailable for ${input.documentReference}`,
        'DEPENDENCY_UNAVAILABLE',
      );
    }

    return {
      result: {
        processor: this.name,
        checksum: digest.toString('hex').slice(0, 16),
        pageCount: input.ocr.pageCount,
        wordCount: input.ocr.text.split(/\s+/u).filter(Boolean).length,
        confidence: input.ocr.confidence,
        processedOnAttempt: input.attempt,
      },
    };
  }
}
