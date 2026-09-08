/* eslint-disable @typescript-eslint/require-await -- these implement an
   intentionally async contract; the deterministic stand-ins perform no I/O */
import { createHash } from 'node:crypto';

import { PermanentError, TransientError } from '@app/messaging';
import { Injectable } from '@nestjs/common';

import { BaseOcrProcessor } from '../base-ocr-processor';

import type { OcrInput } from '../base-ocr-processor';
import type { OcrOutcome } from '@app/contracts';

/**
 * Deterministic stand-in for a real OCR engine.
 *
 * Every output - including whether the call fails, and whether that failure is
 * transient or permanent - is derived from a hash of the document reference. The
 * same input therefore always produces the same behaviour, which is what makes
 * the retry and failure paths reproducible in tests without clocks or randomness.
 *
 * Reference hash, first byte modulo 20:
 *   0-16 -> success
 *   17-18 -> transient failure (a redelivery with a different attempt succeeds)
 *   19 -> permanent failure
 */
@Injectable()
export class DeterministicOcrProcessor extends BaseOcrProcessor {
  readonly name = 'deterministic-ocr';

  supports(): boolean {
    // Fallback engine: claims every type, so it is registered last.
    return true;
  }

  async extract(input: OcrInput): Promise<OcrOutcome> {
    const digest = createHash('sha256').update(input.documentReference).digest();
    const bucket = digest[0] % 20;

    if (bucket === 19) {
      throw new PermanentError(
        `Document ${input.documentReference} is unreadable`,
        'OCR_UNREADABLE',
      );
    }

    if (bucket === 17 || bucket === 18) {
      throw new TransientError(
        `OCR engine temporarily unavailable for ${input.documentReference}`,
        'OCR_ENGINE_UNAVAILABLE',
      );
    }

    const pageCount = (digest[1] % 5) + 1;
    const confidence = Number((0.8 + (digest[2] % 20) / 100).toFixed(2));
    const source = input.payload ? JSON.stringify(input.payload) : (input.payloadUri ?? '');

    return {
      engine: this.name,
      text: `${input.documentType.toUpperCase()} ${input.documentReference}\n${source}`,
      confidence,
      pageCount,
    };
  }
}
