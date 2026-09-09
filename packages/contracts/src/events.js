"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationMode = exports.EventType = void 0;
exports.EventType = {
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
};
exports.NotificationMode = {
    Websocket: 'WEBSOCKET',
    Webhook: 'WEBHOOK',
    Both: 'BOTH',
};
//# sourceMappingURL=events.js.map