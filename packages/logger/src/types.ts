/**
 * Structured data attached to a log record.
 *
 * `correlationId` identifies a whole business flow (one submitted document as it
 * travels across every service); `causationId` identifies the single message that
 * directly triggered the current work. Together they let an operator reconstruct
 * a distributed flow from logs alone.
 */
export interface LogContext {
  correlationId?: string;
  causationId?: string;
  [key: string]: unknown;
}

export const LogLevel = {
  Debug: 'debug',
  Info: 'info',
  Warn: 'warn',
  Error: 'error',
} as const;

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
