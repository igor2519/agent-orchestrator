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
  NotificationBroadcast: 'NotificationBroadcast',
  DocumentDuplicateDetected: 'DocumentDuplicateDetected',
} as const;

export type EventType = (typeof EventType)[keyof typeof EventType];

/**
 * Which channels a customer wants to be told on.
 *
 * Travels on the event because the notification service owns its own database and
 * cannot read the API's settings table.
 */
export const NotificationMode = {
  Websocket: 'WEBSOCKET',
  Webhook: 'WEBHOOK',
  Both: 'BOTH',
} as const;

export type NotificationMode = (typeof NotificationMode)[keyof typeof NotificationMode];

export interface UploadedFileInfo {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface DocumentSubmittedPayload {
  customerId: string;
  documentReference: string;
  documentType: string;
  /** SHA-256 of the file's bytes (or canonical payload); identifies the content. */
  contentHash: string;
  notificationMode: NotificationMode;
  /** Present when the document arrived as an uploaded file. */
  file?: UploadedFileInfo;
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
  /**
   * The processed output.
   *
   * Carried on the event so the API can serve it as a downloadable file without
   * reading the processing service's database. Text-sized by design; binary output
   * would move to object storage with a reference here instead.
   */
  resultText?: string;
}

/**
 * Emitted when a submission matched a file that was already processed.
 *
 * The customer still wants to be told, so this drives the same notification
 * channels as a real outcome - without re-running the pipeline.
 */
export interface DocumentDuplicateDetectedPayload {
  customerId: string;
  documentReference: string;
  documentType: string;
  contentHash: string;
  notificationMode: NotificationMode;
  callbackUrl: string;
  /** The document this submission was recognised as. */
  originalDocumentId: string;
  originalStatus: string;
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

/**
 * Payload pushed to browsers over WebSocket.
 *
 * The notification service cannot hold the socket itself - it serves no HTTP - so
 * the websocket channel "delivers" by publishing this, and the API relays it to
 * connected clients.
 */
export interface NotificationBroadcastPayload {
  deliveryId: string;
  customerId: string;
  documentReference: string;
  event: string;
  status: string | null;
  occurredAt: string;
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
  [EventType.NotificationBroadcast]: NotificationBroadcastPayload;
  [EventType.DocumentDuplicateDetected]: DocumentDuplicateDetectedPayload;
}
