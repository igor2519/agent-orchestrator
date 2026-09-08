/**
 * Error classification drives retry policy. Handlers must throw one of these two
 * rather than a bare `Error`, so the retry decision is a typed contract instead of
 * string-matching on messages.
 */

/** Failure that is expected to succeed on a later attempt (timeout, 503, deadlock). */
export class TransientError extends Error {
  readonly permanent = false;

  constructor(
    message: string,
    readonly code = 'TRANSIENT_ERROR',
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'TransientError';
  }
}

/** Failure that will never succeed however many times it is retried. */
export class PermanentError extends Error {
  readonly permanent = true;

  constructor(
    message: string,
    readonly code = 'PERMANENT_ERROR',
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'PermanentError';
  }
}

export type ClassifiedError = TransientError | PermanentError;

export const isClassifiedError = (error: unknown): error is ClassifiedError =>
  error instanceof TransientError || error instanceof PermanentError;

/**
 * Unclassified errors are treated as permanent on purpose: an unknown failure
 * retried forever is how a poison message takes down a consumer.
 */
export const classifyError = (error: unknown): ClassifiedError => {
  if (isClassifiedError(error)) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);

  return new PermanentError(message, 'UNCLASSIFIED_ERROR', error);
};
