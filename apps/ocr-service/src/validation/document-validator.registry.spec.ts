import { describe, it, expect } from '@jest/globals';

import { DocumentValidatorRegistry } from './document-validator.registry';
import { ExtractedTextValidator } from './validators/extracted-text.validator';
import { InvoiceFieldsValidator } from './validators/invoice-fields.validator';

import type { ValidationInput } from './base-document-validator';

const input = (overrides: Partial<ValidationInput> = {}): ValidationInput => ({
  documentId: '00000000-0000-0000-0000-000000000001',
  documentReference: 'REF-0',
  documentType: 'invoice',
  payload: { amount: 100, currency: 'EUR' },
  ocr: { engine: 'test', text: 'INVOICE REF-0', confidence: 0.95, pageCount: 1 },
  ...overrides,
});

describe('DocumentValidatorRegistry', () => {
  const registry = new DocumentValidatorRegistry([
    new ExtractedTextValidator(),
    new InvoiceFieldsValidator(),
  ]);

  it('runs every validator that claims the type and reports which ran', async () => {
    const { issues, executed } = await registry.validate(input());

    expect(issues).toStrictEqual([]);
    expect(executed).toStrictEqual(['extracted-text', 'invoice-fields']);
  });

  it('skips validators that do not claim the document type', async () => {
    const { executed } = await registry.validate(input({ documentType: 'receipt' }));

    expect(executed).toStrictEqual(['extracted-text']);
  });

  it('pools issues from every applicable validator', async () => {
    const { issues } = await registry.validate(
      input({
        payload: {},
        ocr: { engine: 'test', text: '   ', confidence: 0.1, pageCount: 1 },
      }),
    );

    const codes = issues.map((issue) => issue.code).sort();

    expect(codes).toStrictEqual(['EMPTY_TEXT', 'LOW_CONFIDENCE', 'MISSING_FIELD', 'MISSING_FIELD']);
  });

  it('flags low confidence even when text is present', async () => {
    const { issues } = await registry.validate(
      input({ ocr: { engine: 'test', text: 'something', confidence: 0.5, pageCount: 1 } }),
    );

    expect(issues.map((issue) => issue.code)).toStrictEqual(['LOW_CONFIDENCE']);
  });
});
