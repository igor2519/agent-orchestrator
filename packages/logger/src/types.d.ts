export interface LogContext {
    requestId?: string;
    correlationId?: string;
    causationId?: string;
    [key: string]: unknown;
}
export declare const LogLevel: {
    readonly Debug: "debug";
    readonly Info: "info";
    readonly Warn: "warn";
    readonly Error: "error";
};
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];
export interface LogRecord {
    level: LogLevel;
    message: string;
    service: string;
    timestamp: string;
    context: LogContext;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}
//# sourceMappingURL=types.d.ts.map