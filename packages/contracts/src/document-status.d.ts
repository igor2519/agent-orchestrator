export declare const DocumentStatus: {
    readonly Received: "RECEIVED";
    readonly Validated: "VALIDATED";
    readonly Processing: "PROCESSING";
    readonly Completed: "COMPLETED";
    readonly Failed: "FAILED";
};
export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];
export declare const FailureReason: {
    readonly Validation: "VALIDATION";
    readonly Permanent: "PERMANENT";
    readonly AttemptsExhausted: "ATTEMPTS_EXHAUSTED";
};
export type FailureReason = (typeof FailureReason)[keyof typeof FailureReason];
export declare const TERMINAL_STATUSES: readonly DocumentStatus[];
export declare const isTerminalStatus: (status: DocumentStatus) => boolean;
//# sourceMappingURL=document-status.d.ts.map