import { TransientError } from '@app/messaging';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { createWorker } from 'tesseract.js';

import { BaseOcrProcessor } from '../base-ocr-processor';
import { resolveContent } from '../document-content';

import type { OcrInput } from '../base-ocr-processor';
import type { OcrOutcome } from '@app/contracts';
import type { Worker } from 'tesseract.js';

/** Document types this engine claims. Anything else falls through to the next engine. */
const SUPPORTED_TYPES = new Set(['image', 'scan', 'scanned-document', 'receipt-image']);

/**
 * Real OCR via Tesseract.
 *
 * The worker is expensive to start - it downloads and compiles language data on
 * first use - so one is created lazily and reused for the life of the process,
 * then terminated on shutdown. Recognition is serialised through that single
 * worker; a service handling real volume would use `createScheduler` with a pool
 * sized to its CPU budget.
 *
 * Failure classification matters more than the OCR itself: a missing or corrupt
 * image can never succeed on retry, while a worker or network problem can.
 */
@Injectable()
export class TesseractOcrProcessor extends BaseOcrProcessor implements OnApplicationShutdown {
  readonly name = 'tesseract';

  private worker?: Worker;
  private starting?: Promise<Worker>;

  supports(documentType: string): boolean {
    return SUPPORTED_TYPES.has(documentType.toLowerCase());
  }

  async extract(input: OcrInput): Promise<OcrOutcome> {
    const image = await resolveContent(input);
    const worker = await this.getWorker();

    try {
      const { data } = await worker.recognize(image);

      return {
        engine: this.name,
        text: data.text.trim(),
        // Tesseract reports 0-100; the contract is a 0-1 fraction.
        confidence: Number((data.confidence / 100).toFixed(2)),
        pageCount: 1,
      };
    } catch (error) {
      // A recognition crash usually means a wedged worker: drop it so the next
      // attempt starts a fresh one.
      await this.disposeWorker();

      throw new TransientError(
        `Tesseract failed to recognise ${input.documentReference}`,
        'OCR_ENGINE_FAILURE',
        error,
      );
    }
  }

  /** Lazily starts one worker, and never two when calls overlap. */
  private async getWorker(): Promise<Worker> {
    if (this.worker) {
      return this.worker;
    }

    this.starting ??= createWorker('eng').then((worker) => {
      this.worker = worker;
      this.starting = undefined;

      return worker;
    });

    try {
      return await this.starting;
    } catch (error) {
      this.starting = undefined;

      throw new TransientError('Could not start the Tesseract worker', 'OCR_WORKER_START', error);
    }
  }

  private async disposeWorker(): Promise<void> {
    const worker = this.worker;

    this.worker = undefined;
    await worker?.terminate().catch(() => undefined);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.disposeWorker();
  }
}
