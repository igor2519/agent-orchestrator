import type { OcrOutcome } from '@app/contracts';

export interface ProcessingInput {
  documentId: string;
  documentReference: string;
  documentType: string;
  payload?: Record<string, unknown>;
  payloadUri?: string;
  ocr: OcrOutcome;
  attempt: number;
}

export interface ProcessingOutcome {
  result: Record<string, unknown>;
}

/**
 * Contract for a replaceable document processor.
 *
 * Implementations must be idempotent for a given `documentId`: at-least-once
 * delivery means the same input can legitimately be processed twice, and only the
 * processor knows how to make its own side effects safe.
 *
 * Failures must be reported as `TransientError` or `PermanentError` so the
 * handler can decide between retrying and giving up without inspecting messages.
 */
export abstract class BaseDocumentProcessor {
  abstract readonly name: string;

  abstract supports(documentType: string): boolean;

  abstract process(input: ProcessingInput): Promise<ProcessingOutcome>;
}
