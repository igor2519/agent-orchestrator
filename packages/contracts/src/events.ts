/** Every domain event name published on the `documents` exchange. */
export const EventType = {
  DocumentSubmitted: 'DocumentSubmitted',
  DocumentValidated: 'DocumentValidated',
  DocumentValidationFailed: 'DocumentValidationFailed',
  DocumentProcessingStarted: 'DocumentProcessingStarted',
  DocumentProcessed: 'DocumentProcessed',
  DocumentProcessingFailed: 'DocumentProcessingFailed',
  NotificationDelivered: 'NotificationDelivered',
  NotificationFailed: 'NotificationFailed',
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

export interface DocumentSubmittedPayload {
  customerId: string;
  documentReference: string;
  documentType: string;
  /** Inline synthetic payload. Mutually exclusive with `payloadUri`. */
  payload?: Record<string, unknown>;
  /** Reference to an externally stored payload. Mutually exclusive with `payload`. */
  payloadUri?: string;
  callbackUrl: string;
}

export interface OcrOutcome {
  engine: string;
  text: string;
  confidence: number;
  pageCount: number;
}

export interface DocumentValidatedPayload extends DocumentSubmittedPayload {
  ocr: OcrOutcome;
  validators: string[];
}

export interface ValidationIssue {
  validator: string;
  code: string;
  message: string;
}

export interface DocumentValidationFailedPayload extends DocumentSubmittedPayload {
  issues: ValidationIssue[];
}

export interface DocumentProcessingStartedPayload {
  processor: string;
}

export interface DocumentProcessedPayload extends DocumentSubmittedPayload {
  processor: string;
  result: Record<string, unknown>;
}

export interface DocumentProcessingFailedPayload extends DocumentSubmittedPayload {
  processor: string;
  errorCode: string;
  message: string;
  permanent: boolean;
  attempts: number;
}

/**
 * One webhook call, carried on the terminal notification event.
 *
 * The notification service owns its database and the API cannot read it, so the
 * attempt log travels on the event. That is what keeps delivery outcomes visible
 * through the API without breaking database-per-service ownership.
 */
export interface DeliveryAttemptSummary {
  attemptNumber: number;
  statusCode: number | null;
  succeeded: boolean;
  latencyMs: number;
  error: string | null;
  at: string;
}

export interface NotificationDeliveredPayload {
  deliveryId: string;
  callbackUrl: string;
  statusCode: number;
  attempts: number;
  attemptLog: DeliveryAttemptSummary[];
}

export interface NotificationFailedPayload {
  deliveryId: string;
  callbackUrl: string;
  reason: string;
  attempts: number;
  attemptLog: DeliveryAttemptSummary[];
}

/** Maps each event name to the shape of its `payload` field. */
export interface EventPayloadMap {
  [EventType.DocumentSubmitted]: DocumentSubmittedPayload;
  [EventType.DocumentValidated]: DocumentValidatedPayload;
  [EventType.DocumentValidationFailed]: DocumentValidationFailedPayload;
  [EventType.DocumentProcessingStarted]: DocumentProcessingStartedPayload;
  [EventType.DocumentProcessed]: DocumentProcessedPayload;
  [EventType.DocumentProcessingFailed]: DocumentProcessingFailedPayload;
  [EventType.NotificationDelivered]: NotificationDeliveredPayload;
  [EventType.NotificationFailed]: NotificationFailedPayload;
}
