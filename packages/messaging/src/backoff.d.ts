export interface BackoffOptions {
    baseMs?: number;
    maxMs?: number;
    factor?: number;
}
export declare const computeBackoffMs: (attempt: number, options?: BackoffOptions) => number;
export declare const nextAttemptAt: (attempt: number, options?: BackoffOptions) => Date;
//# sourceMappingURL=backoff.d.ts.map