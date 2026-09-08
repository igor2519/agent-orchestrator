import { PermanentError, TransientError } from '@app/messaging';

import { DeterministicDocumentProcessor } from './deterministic-document.processor';

import type { ProcessingInput } from '../base-document-processor';

const input = (documentReference: string, attempt = 1): ProcessingInput => ({
  documentId: '00000000-0000-0000-0000-000000000001',
  documentReference,
  documentType: 'invoice',
  payload: { amount: 100 },
  ocr: { engine: 'test', text: 'one two three', confidence: 0.9, pageCount: 2 },
  attempt,
});

describe('DeterministicDocumentProcessor', () => {
  const processor = new DeterministicDocumentProcessor();

  it('produces identical output for identical input', async () => {
    expect(await processor.process(input('REF-0'))).toStrictEqual(
      await processor.process(input('REF-0')),
    );
  });

  it('summarises the OCR result', async () => {
    const { result } = await processor.process(input('REF-0'));

    expect(result.processor).toBe('deterministic-processor');
    expect(result.wordCount).toBe(3);
    expect(result.pageCount).toBe(2);
    expect(result.processedOnAttempt).toBe(1);
  });

  it('fails transiently on early attempts then succeeds, exercising the retry path', async () => {
    // REF-14 hashes into the "recovers on attempt 3" bucket.
    await expect(processor.process(input('REF-14', 1))).rejects.toBeInstanceOf(TransientError);
    await expect(processor.process(input('REF-14', 2))).rejects.toBeInstanceOf(TransientError);

    const { result } = await processor.process(input('REF-14', 3));

    expect(result.processedOnAttempt).toBe(3);
  });

  it('fails permanently regardless of attempt for unsupported content', async () => {
    await expect(processor.process(input('REF-1', 1))).rejects.toBeInstanceOf(PermanentError);
    await expect(processor.process(input('REF-1', 9))).rejects.toBeInstanceOf(PermanentError);
  });
});
