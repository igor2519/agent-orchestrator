import type { BaseLogger } from './base-logger';
import type { LoggerService } from '@nestjs/common';

/**
 * Bridges {@link BaseLogger} to the `LoggerService` shape Nest expects, so
 * framework-internal logs land in the same structured stream as business logs.
 */
export class NestLoggerAdapter implements LoggerService {
  constructor(private readonly logger: BaseLogger) {}

  log(message: unknown, ...optional: unknown[]): void {
    this.logger.log(String(message), { scope: NestLoggerAdapter.scopeOf(optional) });
  }

  error(message: unknown, ...optional: unknown[]): void {
    this.logger.error(String(message), optional[0], { scope: NestLoggerAdapter.scopeOf(optional) });
  }

  warn(message: unknown, ...optional: unknown[]): void {
    this.logger.warn(String(message), { scope: NestLoggerAdapter.scopeOf(optional) });
  }

  debug(message: unknown, ...optional: unknown[]): void {
    this.logger.debug(String(message), { scope: NestLoggerAdapter.scopeOf(optional) });
  }

  verbose(message: unknown, ...optional: unknown[]): void {
    this.logger.debug(String(message), { scope: NestLoggerAdapter.scopeOf(optional) });
  }

  private static scopeOf(optional: unknown[]): string | undefined {
    const last = optional[optional.length - 1];

    return typeof last === 'string' ? last : undefined;
  }
}
