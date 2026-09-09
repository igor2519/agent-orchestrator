import { BaseLogger } from './base-logger';
import type { LogContext, LogRecord } from './types';
export declare class ConsoleLogger extends BaseLogger {
    child(context: LogContext): ConsoleLogger;
    protected write(record: LogRecord): void;
}
//# sourceMappingURL=console-logger.d.ts.map