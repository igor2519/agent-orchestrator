import { WebhookClient } from './webhook-client';

const webhookConfig = {
  signingSecret: 'test-secret',
  timeoutMs: 1_000,
  maxAttempts: 5,
  pollIntervalMs: 1_000,
  batchSize: 20,
};

const configFor = (webhook: typeof webhookConfig) =>
  ({ webhook }) as unknown as ConstructorParameters<typeof WebhookClient>[0];

const config = configFor(webhookConfig);

describe('WebhookClient signing', () => {
  const client = new WebhookClient(config);

  it('produces a stable signature for the same body and timestamp', () => {
    expect(client.sign('{"a":1}', '1000')).toBe(client.sign('{"a":1}', '1000'));
  });

  it('accepts a signature it produced', () => {
    const signature = client.sign('{"a":1}', '1000');

    expect(client.verify('{"a":1}', '1000', signature)).toBe(true);
  });

  it('rejects a tampered body', () => {
    const signature = client.sign('{"a":1}', '1000');

    expect(client.verify('{"a":2}', '1000', signature)).toBe(false);
  });

  it('binds the signature to the timestamp so a captured request cannot be replayed', () => {
    const signature = client.sign('{"a":1}', '1000');

    expect(client.verify('{"a":1}', '2000', signature)).toBe(false);
  });

  it('rejects a signature of the wrong length without throwing', () => {
    expect(client.verify('{"a":1}', '1000', 'short')).toBe(false);
  });

  it('produces different signatures under different secrets', () => {
    const other = new WebhookClient(configFor({ ...webhookConfig, signingSecret: 'other-secret' }));

    expect(other.sign('{"a":1}', '1000')).not.toBe(client.sign('{"a":1}', '1000'));
  });
});

describe('WebhookClient delivery outcomes', () => {
  const client = new WebhookClient(config);
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  const stubFetch = (status: number) => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve('body'),
    }) as never;
  };

  it('reports success for a 2xx response', async () => {
    stubFetch(200);

    const result = await client.send('https://example.test/hook', { a: 1 });

    expect(result.succeeded).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.permanent).toBe(false);
  });

  it('treats a 4xx as permanent so attempts are not wasted on a rejected payload', async () => {
    stubFetch(400);

    const result = await client.send('https://example.test/hook', { a: 1 });

    expect(result.succeeded).toBe(false);
    expect(result.permanent).toBe(true);
  });

  it('treats 429 and 408 as retryable despite being 4xx', async () => {
    stubFetch(429);
    expect((await client.send('https://example.test/hook', {})).permanent).toBe(false);

    stubFetch(408);
    expect((await client.send('https://example.test/hook', {})).permanent).toBe(false);
  });

  it('treats a 5xx as retryable', async () => {
    stubFetch(503);

    const result = await client.send('https://example.test/hook', { a: 1 });

    expect(result.succeeded).toBe(false);
    expect(result.permanent).toBe(false);
  });

  it('treats a network failure as retryable and records the error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as never;

    const result = await client.send('https://example.test/hook', { a: 1 });

    expect(result.succeeded).toBe(false);
    expect(result.permanent).toBe(false);
    expect(result.statusCode).toBeNull();
    expect(result.error).toBe('ECONNREFUSED');
  });

  it('sends a signature and timestamp the receiver can verify', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve('') });
    global.fetch = fetchMock as never;

    await client.send('https://example.test/hook', { a: 1 });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    const signature = headers['x-signature'].replace('sha256=', '');

    expect(client.verify(init.body as string, headers['x-timestamp'], signature)).toBe(true);
  });
});
