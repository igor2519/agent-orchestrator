import { LogContext, LogRecord } from './types';
export declare abstract class BaseLogger {
    protected readonly service: string;
    protected readonly baseContext: LogContext;
    constructor(service: string, baseContext?: LogContext);
    protected abstract write(record: LogRecord): void;
    abstract child(context: LogContext): BaseLogger;
    debug(message: string, context?: LogContext): void;
    log(message: string, context?: LogContext): void;
    warn(message: string, context?: LogContext): void;
    error(message: string, error?: unknown, context?: LogContext): void;
    private buildRecord;
    private static stringify;
    private static serializeError;
}
//# sourceMappingURL=base-logger.d.ts.map