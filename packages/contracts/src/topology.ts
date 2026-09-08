import { EventType } from './events';

/** Single topic exchange carrying the whole choreography. */
export const EXCHANGE = 'documents';

/** Dead-letter exchange. Each queue routes here with its own `<queue>.dlq` key. */
export const DEAD_LETTER_EXCHANGE = 'documents.dlx';

/**
 * Routing keys. Retry keys are bound only to the queue of the service that owns
 * the work, so a retry never re-notifies unrelated consumers.
 */
export const RoutingKey = {
  DocumentSubmitted: 'document.submitted',
  DocumentValidated: 'document.validated',
  DocumentValidationFailed: 'document.validation-failed',
  DocumentProcessingStarted: 'document.processing-started',
  DocumentProcessed: 'document.processed',
  DocumentProcessingFailed: 'document.processing-failed',
  NotificationDelivered: 'notification.delivered',
  NotificationFailed: 'notification.failed',
  NotificationBroadcast: 'notification.broadcast',

  OcrRetry: 'document.ocr.retry',
  ProcessingRetry: 'document.processing.retry',
  NotificationRetry: 'notification.delivery.retry',
} as const;

export type RoutingKey = (typeof RoutingKey)[keyof typeof RoutingKey];

/** Default routing key for each event type when a publisher does not override it. */
export const ROUTING_KEY_BY_EVENT: Record<EventType, RoutingKey> = {
  [EventType.DocumentSubmitted]: RoutingKey.DocumentSubmitted,
  [EventType.DocumentValidated]: RoutingKey.DocumentValidated,
  [EventType.DocumentValidationFailed]: RoutingKey.DocumentValidationFailed,
  [EventType.DocumentProcessingStarted]: RoutingKey.DocumentProcessingStarted,
  [EventType.DocumentProcessed]: RoutingKey.DocumentProcessed,
  [EventType.DocumentProcessingFailed]: RoutingKey.DocumentProcessingFailed,
  [EventType.NotificationDelivered]: RoutingKey.NotificationDelivered,
  [EventType.NotificationFailed]: RoutingKey.NotificationFailed,
  [EventType.NotificationBroadcast]: RoutingKey.NotificationBroadcast,
};

export const Queue = {
  Ocr: 'ocr.documents',
  Processing: 'processing.documents',
  Notification: 'notification.documents',
  ApiProjection: 'api.projection',
} as const;

export type Queue = (typeof Queue)[keyof typeof Queue];

/**
 * Which routing keys each queue subscribes to. This table *is* the workflow:
 * changing a binding rewires the choreography without any service knowing about
 * another service.
 */
export const QUEUE_BINDINGS: Record<Queue, readonly RoutingKey[]> = {
  [Queue.Ocr]: [RoutingKey.DocumentSubmitted, RoutingKey.OcrRetry],
  [Queue.Processing]: [RoutingKey.DocumentValidated, RoutingKey.ProcessingRetry],
  [Queue.Notification]: [
    RoutingKey.DocumentProcessed,
    RoutingKey.DocumentProcessingFailed,
    RoutingKey.DocumentValidationFailed,
    RoutingKey.NotificationRetry,
  ],
  [Queue.ApiProjection]: [
    RoutingKey.DocumentValidated,
    RoutingKey.DocumentValidationFailed,
    RoutingKey.DocumentProcessingStarted,
    RoutingKey.DocumentProcessed,
    RoutingKey.DocumentProcessingFailed,
    RoutingKey.NotificationDelivered,
    RoutingKey.NotificationFailed,
    RoutingKey.NotificationBroadcast,
  ],
};

export const deadLetterQueueOf = (queue: Queue): string => `${queue}.dlq`;
