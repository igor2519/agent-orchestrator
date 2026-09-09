export declare class TransientError extends Error {
    readonly code: string;
    readonly cause?: unknown | undefined;
    readonly permanent = false;
    constructor(message: string, code?: string, cause?: unknown | undefined);
}
export declare class PermanentError extends Error {
    readonly code: string;
    readonly cause?: unknown | undefined;
    readonly permanent = true;
    constructor(message: string, code?: string, cause?: unknown | undefined);
}
export type ClassifiedError = TransientError | PermanentError;
export declare const isClassifiedError: (error: unknown) => error is ClassifiedError;
export declare const classifyError: (error: unknown) => ClassifiedError;
//# sourceMappingURL=errors.d.ts.map