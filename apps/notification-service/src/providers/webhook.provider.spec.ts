import { createHmac } from 'node:crypto';

import { describe, it, expect, afterEach, jest } from '@jest/globals';

import { WebhookProvider } from './webhook.provider';

import type { NotificationDelivery } from '../entities/notification-delivery.entity';

const secret = 'test-secret';
const config = {
  webhook: { signingSecret: secret, timeoutMs: 1_000, maxAttempts: 5 },
} as never;

const delivery = (callbackUrl: string | null = 'https://example.test/hook') =>
  ({ callbackUrl, payload: { a: 1 } }) as unknown as NotificationDelivery;

describe('WebhookProvider', () => {
  const provider = new WebhookProvider(config);
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  /**
   * Typed through its implementation rather than `mockResolvedValue`, so the
   * recorded call arguments stay typed and can be read back without a cast.
   */
  const stubFetch = (status: number) => {
    const mock = jest.fn((_url: string, _init?: RequestInit) =>
      Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        text: () => Promise.resolve('body'),
      } as Response),
    );

    global.fetch = mock as unknown as typeof fetch;

    return mock;
  };

  describe('channel selection', () => {
    it('declares the webhook channel', () => {
      expect(provider.channel).toBe('WEBHOOK');
    });

    it('opts out when there is no callback target', () => {
      expect(
        provider.supports({
          callbackUrl: null,
          eventType: 'DocumentProcessed',
          notificationMode: 'WEBHOOK',
        }),
      ).toBe(false);
    });

    it('opts out when the customer did not select a webhook channel', () => {
      // WEBSOCKET is the default; a stored callback URL alone must not start
      // sending webhooks the customer never asked for.
      expect(
        provider.supports({
          callbackUrl: 'https://x.test/h',
          eventType: 'DocumentProcessed',
          notificationMode: 'WEBSOCKET',
        }),
      ).toBe(false);
    });

    it('opts in for WEBHOOK mode with a target', () => {
      expect(
        provider.supports({
          callbackUrl: 'https://x.test/h',
          eventType: 'DocumentProcessed',
          notificationMode: 'WEBHOOK',
        }),
      ).toBe(true);
    });

    it('opts in for BOTH mode with a target', () => {
      expect(
        provider.supports({
          callbackUrl: 'https://x.test/h',
          eventType: 'DocumentProcessed',
          notificationMode: 'BOTH',
        }),
      ).toBe(true);
    });
  });

  describe('signing', () => {
    it('signs the timestamp together with the body, so a capture cannot be replayed', async () => {
      const mock = stubFetch(200);

      await provider.deliver(delivery());

      const [, init] = mock.mock.calls[0];
      const headers = init?.headers as Record<string, string>;
      const expected = createHmac('sha256', secret)
        .update(`${headers['x-timestamp']}.${init?.body as string}`)
        .digest('hex');

      expect(headers['x-signature']).toBe(`sha256=${expected}`);
    });
  });

  describe('outcome classification', () => {
    it('reports success for a 2xx', async () => {
      stubFetch(200);

      const result = await provider.deliver(delivery());

      expect(result.succeeded).toBe(true);
      expect(result.permanent).toBe(false);
    });

    it('treats a 4xx as permanent so attempts are not spent on a rejected payload', async () => {
      stubFetch(400);

      expect((await provider.deliver(delivery())).permanent).toBe(true);
    });

    it('treats 408 and 429 as retryable despite being 4xx', async () => {
      stubFetch(408);
      expect((await provider.deliver(delivery())).permanent).toBe(false);

      stubFetch(429);
      expect((await provider.deliver(delivery())).permanent).toBe(false);
    });

    it('treats a 5xx as retryable', async () => {
      stubFetch(503);

      const result = await provider.deliver(delivery());

      expect(result.succeeded).toBe(false);
      expect(result.permanent).toBe(false);
    });

    it('treats a network failure as retryable and records the error', async () => {
      global.fetch = jest.fn((_url: string, _init?: RequestInit) =>
        Promise.reject(new Error('ECONNREFUSED')),
      ) as unknown as typeof fetch;

      const result = await provider.deliver(delivery());

      expect(result.permanent).toBe(false);
      expect(result.statusCode).toBeNull();
      expect(result.error).toBe('ECONNREFUSED');
    });

    it('fails permanently without calling out when the URL is missing', async () => {
      const mock = stubFetch(200);

      const result = await provider.deliver(delivery(null));

      expect(result.permanent).toBe(true);
      expect(mock).not.toHaveBeenCalled();
    });
  });
});
