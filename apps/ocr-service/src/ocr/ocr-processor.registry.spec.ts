/* eslint-disable @typescript-eslint/require-await -- these implement an
   intentionally async contract; the deterministic stand-ins perform no I/O */
import { PermanentError } from '@app/messaging';
import { describe, it, expect } from '@jest/globals';

import { BaseOcrProcessor } from './base-ocr-processor';
import { OcrProcessorRegistry } from './ocr-processor.registry';

import type { OcrInput } from './base-ocr-processor';
import type { OcrOutcome } from '@app/contracts';

class StubProcessor extends BaseOcrProcessor {
  constructor(
    readonly name: string,
    private readonly type: string | null,
  ) {
    super();
  }

  supports(documentType: string): boolean {
    return this.type === null || this.type === documentType;
  }

  async extract(_input: OcrInput): Promise<OcrOutcome> {
    return { engine: this.name, text: '', confidence: 1, pageCount: 1 };
  }
}

describe('OcrProcessorRegistry', () => {
  it('prefers the first registered engine that claims the type', () => {
    const registry = new OcrProcessorRegistry([
      new StubProcessor('invoice-engine', 'invoice'),
      new StubProcessor('fallback', null),
    ]);

    expect(registry.resolve('invoice').name).toBe('invoice-engine');
    expect(registry.resolve('receipt').name).toBe('fallback');
  });

  it('fails permanently when nothing supports the type, so retries are not wasted', () => {
    const registry = new OcrProcessorRegistry([new StubProcessor('invoice-engine', 'invoice')]);

    expect(() => registry.resolve('receipt')).toThrow(PermanentError);
  });

  it('reports what is registered for operational visibility', () => {
    const registry = new OcrProcessorRegistry([new StubProcessor('a', null)]);

    expect(registry.registered).toStrictEqual(['a']);
  });
});
