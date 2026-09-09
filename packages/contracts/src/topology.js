"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deadLetterQueueOf = exports.QUEUE_BINDINGS = exports.Queue = exports.ROUTING_KEY_BY_EVENT = exports.RoutingKey = exports.DEAD_LETTER_EXCHANGE = exports.EXCHANGE = void 0;
const events_1 = require("./events");
exports.EXCHANGE = 'documents';
exports.DEAD_LETTER_EXCHANGE = 'documents.dlx';
exports.RoutingKey = {
    DocumentSubmitted: 'document.submitted',
    DocumentValidated: 'document.validated',
    DocumentValidationFailed: 'document.validation-failed',
    DocumentProcessingStarted: 'document.processing-started',
    DocumentProcessed: 'document.processed',
    DocumentProcessingFailed: 'document.processing-failed',
    NotificationDelivered: 'notification.delivered',
    NotificationFailed: 'notification.failed',
    NotificationBroadcast: 'notification.broadcast',
    DocumentDuplicateDetected: 'document.duplicate-detected',
    OcrRetry: 'document.ocr.retry',
    ProcessingRetry: 'document.processing.retry',
    NotificationRetry: 'notification.delivery.retry',
};
exports.ROUTING_KEY_BY_EVENT = {
    [events_1.EventType.DocumentSubmitted]: exports.RoutingKey.DocumentSubmitted,
    [events_1.EventType.DocumentValidated]: exports.RoutingKey.DocumentValidated,
    [events_1.EventType.DocumentValidationFailed]: exports.RoutingKey.DocumentValidationFailed,
    [events_1.EventType.DocumentProcessingStarted]: exports.RoutingKey.DocumentProcessingStarted,
    [events_1.EventType.DocumentProcessed]: exports.RoutingKey.DocumentProcessed,
    [events_1.EventType.DocumentProcessingFailed]: exports.RoutingKey.DocumentProcessingFailed,
    [events_1.EventType.NotificationDelivered]: exports.RoutingKey.NotificationDelivered,
    [events_1.EventType.NotificationFailed]: exports.RoutingKey.NotificationFailed,
    [events_1.EventType.NotificationBroadcast]: exports.RoutingKey.NotificationBroadcast,
    [events_1.EventType.DocumentDuplicateDetected]: exports.RoutingKey.DocumentDuplicateDetected,
};
exports.Queue = {
    Ocr: 'ocr.documents',
    Processing: 'processing.documents',
    Notification: 'notification.documents',
    ApiProjection: 'api.projection',
};
exports.QUEUE_BINDINGS = {
    [exports.Queue.Ocr]: [exports.RoutingKey.DocumentSubmitted, exports.RoutingKey.OcrRetry],
    [exports.Queue.Processing]: [exports.RoutingKey.DocumentValidated, exports.RoutingKey.ProcessingRetry],
    [exports.Queue.Notification]: [
        exports.RoutingKey.DocumentProcessed,
        exports.RoutingKey.DocumentProcessingFailed,
        exports.RoutingKey.DocumentValidationFailed,
        exports.RoutingKey.DocumentDuplicateDetected,
        exports.RoutingKey.NotificationRetry,
    ],
    [exports.Queue.ApiProjection]: [
        exports.RoutingKey.DocumentValidated,
        exports.RoutingKey.DocumentValidationFailed,
        exports.RoutingKey.DocumentProcessingStarted,
        exports.RoutingKey.DocumentProcessed,
        exports.RoutingKey.DocumentProcessingFailed,
        exports.RoutingKey.NotificationDelivered,
        exports.RoutingKey.NotificationFailed,
        exports.RoutingKey.NotificationBroadcast,
    ],
};
const deadLetterQueueOf = (queue) => `${queue}.dlq`;
exports.deadLetterQueueOf = deadLetterQueueOf;
//# sourceMappingURL=topology.js.map