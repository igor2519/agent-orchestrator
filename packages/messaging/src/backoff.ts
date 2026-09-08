export interface BackoffOptions {
  /** Delay before the second attempt, in milliseconds. */
  baseMs?: number;
  /** Upper bound on the computed delay, before jitter. */
  maxMs?: number;
  /** Multiplier applied per attempt. */
  factor?: number;
}

const DEFAULTS: Required<BackoffOptions> = {
  baseMs: 1_000,
  maxMs: 5 * 60_000,
  factor: 2,
};

/**
 * Exponential backoff with full jitter.
 *
 * Full jitter (a uniform sample from `[0, delay]` rather than `delay ± noise`)
 * is what stops a batch of messages that failed together from retrying in
 * lockstep and re-creating the load spike that caused the failure.
 *
 * @param attempt - 1-based number of attempts already made.
 */
export const computeBackoffMs = (attempt: number, options: BackoffOptions = {}): number => {
  const { baseMs, maxMs, factor } = { ...DEFAULTS, ...options };
  const exponential = Math.min(baseMs * factor ** Math.max(0, attempt - 1), maxMs);

  return Math.floor(Math.random() * exponential);
};

export const nextAttemptAt = (attempt: number, options?: BackoffOptions): Date =>
  new Date(Date.now() + computeBackoffMs(attempt, options));
