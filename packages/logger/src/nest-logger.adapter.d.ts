import type { BaseLogger } from './base-logger';
import type { LoggerService } from '@nestjs/common';
export declare class NestLoggerAdapter implements LoggerService {
    private readonly logger;
    constructor(logger: BaseLogger);
    log(message: unknown, ...optional: unknown[]): void;
    error(message: unknown, ...optional: unknown[]): void;
    warn(message: unknown, ...optional: unknown[]): void;
    debug(message: unknown, ...optional: unknown[]): void;
    verbose(message: unknown, ...optional: unknown[]): void;
    private static scopeOf;
}
//# sourceMappingURL=nest-logger.adapter.d.ts.map