import { LogContext, LogLevel, LogRecord } from './types';

/**
 * The logging abstraction every service depends on.
 *
 * Business code must depend on this class, never on `console` directly, so the
 * transport can be replaced (file, stdout collector, hosted log service) without
 * touching a single call site.
 *
 * Subclasses implement one method: {@link write}.
 */
export abstract class BaseLogger {
  constructor(
    protected readonly service: string,
    protected readonly baseContext: LogContext = {},
  ) {}

  /** Emit a single fully-built record. The only method a subclass must implement. */
  protected abstract write(record: LogRecord): void;

  /**
   * Derive a logger that carries additional context on every record, used to bind
   * a correlation id for the lifetime of one message or HTTP request.
   */
  abstract child(context: LogContext): BaseLogger;

  debug(message: string, context?: LogContext): void {
    this.write(this.buildRecord(LogLevel.Debug, message, context));
  }

  log(message: string, context?: LogContext): void {
    this.write(this.buildRecord(LogLevel.Info, message, context));
  }

  warn(message: string, context?: LogContext): void {
    this.write(this.buildRecord(LogLevel.Warn, message, context));
  }

  error(message: string, error?: unknown, context?: LogContext): void {
    this.write({
      ...this.buildRecord(LogLevel.Error, message, context),
      error: BaseLogger.serializeError(error),
    });
  }

  private buildRecord(level: LogLevel, message: string, context?: LogContext): LogRecord {
    return {
      level,
      message,
      service: this.service,
      timestamp: new Date().toISOString(),
      context: { ...this.baseContext, ...context },
    };
  }

  /** Safe for values of any shape, including plain objects that have no useful toString. */
  private static stringify(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value) ?? 'undefined';
      } catch {
        return '[unserializable]';
      }
    }

    return typeof value === 'symbol' ? value.toString() : `${value as number | boolean}`;
  }

  private static serializeError(error: unknown): LogRecord['error'] {
    if (error === undefined || error === null) {
      return undefined;
    }

    if (error instanceof Error) {
      return { name: error.name, message: error.message, stack: error.stack };
    }

    return { name: 'UnknownError', message: BaseLogger.stringify(error) };
  }
}
