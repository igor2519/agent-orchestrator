export declare const EventType: {
    readonly DocumentSubmitted: "DocumentSubmitted";
    readonly DocumentValidated: "DocumentValidated";
    readonly DocumentValidationFailed: "DocumentValidationFailed";
    readonly DocumentProcessingStarted: "DocumentProcessingStarted";
    readonly DocumentProcessed: "DocumentProcessed";
    readonly DocumentProcessingFailed: "DocumentProcessingFailed";
    readonly NotificationDelivered: "NotificationDelivered";
    readonly NotificationFailed: "NotificationFailed";
    readonly NotificationBroadcast: "NotificationBroadcast";
    readonly DocumentDuplicateDetected: "DocumentDuplicateDetected";
};
export type EventType = (typeof EventType)[keyof typeof EventType];
export declare const NotificationMode: {
    readonly Websocket: "WEBSOCKET";
    readonly Webhook: "WEBHOOK";
    readonly Both: "BOTH";
};
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
    contentHash: string;
    notificationMode: NotificationMode;
    file?: UploadedFileInfo;
    payload?: Record<string, unknown>;
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
    resultText?: string;
}
export interface DocumentDuplicateDetectedPayload {
    customerId: string;
    documentReference: string;
    documentType: string;
    contentHash: string;
    notificationMode: NotificationMode;
    callbackUrl: string;
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
export interface NotificationBroadcastPayload {
    deliveryId: string;
    customerId: string;
    documentReference: string;
    event: string;
    status: string | null;
    occurredAt: string;
}
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
//# sourceMappingURL=events.d.ts.map