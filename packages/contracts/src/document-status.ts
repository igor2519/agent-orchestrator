/**
 * Lifecycle of a submitted document, as projected by the API service.
 *
 * No service owns this transition table centrally: each status is the API's
 * reaction to a domain event published by whichever service did the work.
 *
 *   RECEIVED -> VALIDATED -> PROCESSING -> COMPLETED
 *      |            |            |
 *      +------------+------------+--> FAILED
 */
export const DocumentStatus = {
  Received: 'RECEIVED',
  Validated: 'VALIDATED',
  Processing: 'PROCESSING',
  Completed: 'COMPLETED',
  Failed: 'FAILED',
} as const;

export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

/** Why a document ended in {@link DocumentStatus.Failed}. */
export const FailureReason = {
  Validation: 'VALIDATION',
  Permanent: 'PERMANENT',
  AttemptsExhausted: 'ATTEMPTS_EXHAUSTED',
} as const;

export type FailureReason = (typeof FailureReason)[keyof typeof FailureReason];

/** Terminal statuses never transition again. */
export const TERMINAL_STATUSES: readonly DocumentStatus[] = [
  DocumentStatus.Completed,
  DocumentStatus.Failed,
];

export const isTerminalStatus = (status: DocumentStatus): boolean =>
  TERMINAL_STATUSES.includes(status);
