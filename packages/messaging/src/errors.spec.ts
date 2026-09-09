import { describe, it, expect } from '@jest/globals';

import { PermanentError, TransientError, classifyError, isClassifiedError } from './errors';

describe('classifyError', () => {
  it('preserves an explicitly transient error', () => {
    const error = new TransientError('broker unavailable', 'BROKER_DOWN');
    const classified = classifyError(error);

    expect(classified).toBe(error);
    expect(classified.permanent).toBe(false);
  });

  it('preserves an explicitly permanent error', () => {
    const error = new PermanentError('unsupported type', 'UNSUPPORTED');

    expect(classifyError(error).permanent).toBe(true);
  });

  it('treats an unclassified error as permanent so a poison message cannot loop forever', () => {
    const classified = classifyError(new Error('something odd'));

    expect(classified.permanent).toBe(true);
    expect(classified.code).toBe('UNCLASSIFIED_ERROR');
    expect(classified.message).toBe('something odd');
  });

  it('handles non-Error throws', () => {
    expect(classifyError('a string').message).toBe('a string');
    expect(classifyError(undefined).permanent).toBe(true);
  });
});

describe('isClassifiedError', () => {
  it('recognises only the two classified types', () => {
    expect(isClassifiedError(new TransientError('x'))).toBe(true);
    expect(isClassifiedError(new PermanentError('x'))).toBe(true);
    expect(isClassifiedError(new Error('x'))).toBe(false);
  });
});
