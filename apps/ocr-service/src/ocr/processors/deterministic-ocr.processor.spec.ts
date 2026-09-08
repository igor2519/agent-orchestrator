import { PermanentError, TransientError } from '@app/messaging';

import { DeterministicOcrProcessor } from './deterministic-ocr.processor';

import type { OcrInput } from '../base-ocr-processor';

const input = (documentReference: string): OcrInput => ({
  documentId: '00000000-0000-0000-0000-000000000001',
  documentReference,
  documentType: 'invoice',
  payload: { amount: 100 },
});

describe('DeterministicOcrProcessor', () => {
  const processor = new DeterministicOcrProcessor();

  it('produces identical output for identical input', async () => {
    const first = await processor.extract(input('REF-0'));
    const second = await processor.extract(input('REF-0'));

    expect(first).toStrictEqual(second);
  });

  it('extracts text that carries the document type and reference', async () => {
    const result = await processor.extract(input('REF-0'));

    expect(result.engine).toBe('deterministic-ocr');
    expect(result.text).toContain('INVOICE');
    expect(result.text).toContain('REF-0');
    expect(result.pageCount).toBeGreaterThanOrEqual(1);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('raises a transient error for references in the retryable bucket', async () => {
    // REF-4 hashes into the transient bucket; a retry of the same input is
    // expected to be worth attempting.
    await expect(processor.extract(input('REF-4'))).rejects.toBeInstanceOf(TransientError);
  });

  it('raises a permanent error for unreadable references', async () => {
    await expect(processor.extract(input('REF-35'))).rejects.toBeInstanceOf(PermanentError);
  });

  it('acts as the fallback engine for any document type', () => {
    expect(processor.supports()).toBe(true);
  });
});
