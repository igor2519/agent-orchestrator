import { EventType } from './events';
export declare const EXCHANGE = "documents";
export declare const DEAD_LETTER_EXCHANGE = "documents.dlx";
export declare const RoutingKey: {
    readonly DocumentSubmitted: "document.submitted";
    readonly DocumentValidated: "document.validated";
    readonly DocumentValidationFailed: "document.validation-failed";
    readonly DocumentProcessingStarted: "document.processing-started";
    readonly DocumentProcessed: "document.processed";
    readonly DocumentProcessingFailed: "document.processing-failed";
    readonly NotificationDelivered: "notification.delivered";
    readonly NotificationFailed: "notification.failed";
    readonly NotificationBroadcast: "notification.broadcast";
    readonly DocumentDuplicateDetected: "document.duplicate-detected";
    readonly OcrRetry: "document.ocr.retry";
    readonly ProcessingRetry: "document.processing.retry";
    readonly NotificationRetry: "notification.delivery.retry";
};
export type RoutingKey = (typeof RoutingKey)[keyof typeof RoutingKey];
export declare const ROUTING_KEY_BY_EVENT: Record<EventType, RoutingKey>;
export declare const Queue: {
    readonly Ocr: "ocr.documents";
    readonly Processing: "processing.documents";
    readonly Notification: "notification.documents";
    readonly ApiProjection: "api.projection";
};
export type Queue = (typeof Queue)[keyof typeof Queue];
export declare const QUEUE_BINDINGS: Record<Queue, readonly RoutingKey[]>;
export declare const deadLetterQueueOf: (queue: Queue) => string;
//# sourceMappingURL=topology.d.ts.map