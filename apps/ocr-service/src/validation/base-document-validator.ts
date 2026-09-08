import type { OcrOutcome, ValidationIssue } from '@app/contracts';

export interface ValidationInput {
  documentId: string;
  documentReference: string;
  documentType: string;
  payload?: Record<string, unknown>;
  ocr: OcrOutcome;
}

/**
 * Contract for a content validation rule applied to an OCR result.
 *
 * Validators are additive: each returns the issues it found, and the handler
 * fails the document when any validator reports one. Adding a rule means adding a
 * class to the providers list, never editing the handler.
 */
export abstract class BaseDocumentValidator {
  abstract readonly name: string;

  abstract supports(documentType: string): boolean;

  abstract validate(input: ValidationInput): Promise<ValidationIssue[]>;
}
