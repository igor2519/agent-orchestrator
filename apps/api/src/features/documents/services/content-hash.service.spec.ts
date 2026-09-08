import { ContentHashService } from './content-hash.service';

describe('ContentHashService', () => {
  const service = new ContentHashService();

  it('produces the same hash for identical payloads', () => {
    expect(service.hash({ payload: { a: 1 } })).toBe(service.hash({ payload: { a: 1 } }));
  });

  it('ignores key order, so equivalent JSON is recognised as the same file', () => {
    expect(service.hash({ payload: { amount: 100, currency: 'EUR' } })).toBe(
      service.hash({ payload: { currency: 'EUR', amount: 100 } }),
    );
  });

  it('ignores key order in nested objects', () => {
    expect(service.hash({ payload: { outer: { a: 1, b: 2 } } })).toBe(
      service.hash({ payload: { outer: { b: 2, a: 1 } } }),
    );
  });

  it('respects array order, which is meaningful', () => {
    expect(service.hash({ payload: { lines: [1, 2] } })).not.toBe(
      service.hash({ payload: { lines: [2, 1] } }),
    );
  });

  it('changes when any value changes', () => {
    expect(service.hash({ payload: { amount: 100 } })).not.toBe(
      service.hash({ payload: { amount: 101 } }),
    );
  });

  it('distinguishes a value from a differently-typed one', () => {
    expect(service.hash({ payload: { amount: 100 } })).not.toBe(
      service.hash({ payload: { amount: '100' } }),
    );
  });

  it('hashes a payload reference distinctly from inline content', () => {
    expect(service.hash({ payloadUri: 'https://files.test/a' })).not.toBe(
      service.hash({ payload: { uri: 'https://files.test/a' } }),
    );
  });

  it('treats the same reference as the same file', () => {
    expect(service.hash({ payloadUri: 'https://files.test/a' })).toBe(
      service.hash({ payloadUri: 'https://files.test/a' }),
    );
  });

  it('returns a hex sha-256 digest', () => {
    expect(service.hash({ payload: {} })).toMatch(/^[0-9a-f]{64}$/u);
  });

  it('handles null and nested arrays without throwing', () => {
    expect(() => service.hash({ payload: { a: null, b: [{ c: [1, null] }] } })).not.toThrow();
  });
});
