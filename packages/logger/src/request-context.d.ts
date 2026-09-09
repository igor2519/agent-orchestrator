import type { LogContext } from './types';
export declare const RequestContext: {
    run<TResult>(context: LogContext, fn: () => TResult): TResult;
    get(): LogContext;
    readonly requestId: string | undefined;
};
//# sourceMappingURL=request-context.d.ts.map