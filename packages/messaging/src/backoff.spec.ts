import { computeBackoffMs, nextAttemptAt } from './backoff';

describe('computeBackoffMs', () => {
  const options = { baseMs: 1_000, maxMs: 60_000, factor: 2 };

  it('never returns a delay above the exponential ceiling for the attempt', () => {
    // Full jitter samples [0, ceiling), so the ceiling is the only hard bound.
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const ceiling = Math.min(options.baseMs * options.factor ** (attempt - 1), options.maxMs);

      for (let i = 0; i < 200; i += 1) {
        const delay = computeBackoffMs(attempt, options);

        expect(delay).toBeGreaterThanOrEqual(0);
        expect(delay).toBeLessThan(ceiling);
      }
    }
  });

  it('raises the ceiling as attempts increase', () => {
    const ceilingFor = (attempt: number) =>
      Math.max(...Array.from({ length: 400 }, () => computeBackoffMs(attempt, options)));

    expect(ceilingFor(4)).toBeGreaterThan(ceilingFor(1));
  });

  it('caps the ceiling at maxMs however many attempts have been made', () => {
    for (let i = 0; i < 300; i += 1) {
      expect(computeBackoffMs(50, options)).toBeLessThan(options.maxMs);
    }
  });

  it('spreads concurrent retries instead of aligning them', () => {
    // Without jitter a batch that failed together retries together and recreates
    // the load spike, so distinct values are the property that matters.
    const delays = new Set(Array.from({ length: 100 }, () => computeBackoffMs(5, options)));

    expect(delays.size).toBeGreaterThan(50);
  });

  it('treats attempt 0 as the first attempt rather than producing a negative exponent', () => {
    expect(computeBackoffMs(0, options)).toBeLessThan(options.baseMs);
  });
});

describe('nextAttemptAt', () => {
  it('returns a future timestamp within the ceiling', () => {
    const before = Date.now();
    const at = nextAttemptAt(3, { baseMs: 1_000, maxMs: 60_000, factor: 2 });

    expect(at.getTime()).toBeGreaterThanOrEqual(before);
    expect(at.getTime()).toBeLessThan(before + 4_000);
  });
});
