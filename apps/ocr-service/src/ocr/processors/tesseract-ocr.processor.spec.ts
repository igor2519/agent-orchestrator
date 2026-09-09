import { PermanentError, TransientError } from '@app/messaging';
import { describe, it, expect, jest } from '@jest/globals';

import { TesseractOcrProcessor } from './tesseract-ocr.processor';

import type { OcrInput } from '../base-ocr-processor';

const input = (overrides: Partial<OcrInput> = {}): OcrInput => ({
  documentId: '00000000-0000-0000-0000-000000000001',
  documentReference: 'REF-IMG',
  documentType: 'image',
  ...overrides,
});

describe('TesseractOcrProcessor', () => {
  const processor = new TesseractOcrProcessor();

  describe('supports', () => {
    it('claims image-bearing document types', () => {
      for (const type of ['image', 'scan', 'scanned-document', 'receipt-image']) {
        expect(processor.supports(type)).toBe(true);
      }
    });

    it('is case-insensitive', () => {
      expect(processor.supports('IMAGE')).toBe(true);
    });

    it('leaves other types to the next engine', () => {
      expect(processor.supports('invoice')).toBe(false);
    });
  });

  describe('image resolution', () => {
    it('fails permanently when no image source is given', async () => {
      // Neither retrying nor waiting will produce an image.
      await expect(processor.extract(input({ payload: {} }))).rejects.toBeInstanceOf(
        PermanentError,
      );
    });

    it('fails permanently when the reference cannot be fetched with a 4xx', async () => {
      const originalFetch = global.fetch;

      global.fetch = jest.fn((_url: string) =>
        Promise.resolve({ ok: false, status: 404 } as Response),
      ) as unknown as typeof fetch;

      await expect(
        processor.extract(input({ payloadUri: 'https://files.test/missing.png' })),
      ).rejects.toBeInstanceOf(PermanentError);

      global.fetch = originalFetch;
    });

    it('fails transiently when the reference returns a 5xx', async () => {
      const originalFetch = global.fetch;

      global.fetch = jest.fn((_url: string) =>
        Promise.resolve({ ok: false, status: 503 } as Response),
      ) as unknown as typeof fetch;

      await expect(
        processor.extract(input({ payloadUri: 'https://files.test/flaky.png' })),
      ).rejects.toBeInstanceOf(TransientError);

      global.fetch = originalFetch;
    });

    it('fails transiently when the fetch itself throws', async () => {
      const originalFetch = global.fetch;

      global.fetch = jest.fn((_url: string) =>
        Promise.reject(new Error('ECONNRESET')),
      ) as unknown as typeof fetch;

      await expect(
        processor.extract(input({ payloadUri: 'https://files.test/down.png' })),
      ).rejects.toBeInstanceOf(TransientError);

      global.fetch = originalFetch;
    });
  });
});
