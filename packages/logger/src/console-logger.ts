import { BaseLogger } from './base-logger';

import type { LogContext, LogRecord } from './types';

/**
 * Default {@link BaseLogger} implementation.
 *
 * This is the only place in the codebase allowed to reference `console`. Records
 * are emitted as single-line JSON so a log collector can parse them without a
 * custom grok pattern.
 */
export class ConsoleLogger extends BaseLogger {
  child(context: LogContext): ConsoleLogger {
    return new ConsoleLogger(this.service, { ...this.baseContext, ...context });
  }

  protected write(record: LogRecord): void {
    const line = JSON.stringify(record);

    switch (record.level) {
      case 'error':
        console.error(line);
        break;
      case 'warn':
        console.warn(line);
        break;
      default:
        // eslint-disable-next-line no-console -- this class is the single sanctioned console boundary
        console.log(line);
    }
  }
}
