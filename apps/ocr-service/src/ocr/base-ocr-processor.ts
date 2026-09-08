import type { OcrOutcome } from '@app/contracts';

export interface OcrInput {
  documentId: string;
  documentReference: string;
  documentType: string;
  payload?: Record<string, unknown>;
  payloadUri?: string;
}

/**
 * Contract every OCR implementation satisfies.
 *
 * A new engine is added by extending this class and listing it in the module's
 * providers. The event handler resolves engines through the registry and never
 * names a concrete one, so the workflow does not change.
 */
export abstract class BaseOcrProcessor {
  /** Stable identifier recorded on the result and in emitted events. */
  abstract readonly name: string;

  /** Whether this engine can handle the given document type. */
  abstract supports(documentType: string): boolean;

  abstract extract(input: OcrInput): Promise<OcrOutcome>;
}
