import { createHmac, timingSafeEqual } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import envConfig from '../config/env.config';

import type { ConfigType } from '@nestjs/config';

export interface WebhookResult {
  succeeded: boolean;
  statusCode: number | null;
  latencyMs: number;
  error: string | null;
  responseSnippet: string | null;
  /** 4xx other than 408/429 will never succeed on retry. */
  permanent: boolean;
}

const RESPONSE_SNIPPET_LIMIT = 512;

@Injectable()
export class WebhookClient {
  constructor(@Inject(envConfig.KEY) private readonly config: ConfigType<typeof envConfig>) {}

  /**
   * Signs the body so the receiver can prove it came from us and was not replayed.
   * The timestamp is inside the signed material, so a captured request cannot be
   * replayed later without invalidating the signature.
   */
  sign(body: string, timestamp: string): string {
    return createHmac('sha256', this.config.webhook.signingSecret)
      .update(`${timestamp}.${body}`)
      .digest('hex');
  }

  verify(body: string, timestamp: string, signature: string): boolean {
    const expected = Buffer.from(this.sign(body, timestamp));
    const actual = Buffer.from(signature);

    // Constant-time comparison: a fast-fail compare leaks the signature byte by byte.
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  async send(url: string, payload: Record<string, unknown>): Promise<WebhookResult> {
    const body = JSON.stringify(payload);
    const timestamp = Date.now().toString();
    const startedAt = Date.now();

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-signature': `sha256=${this.sign(body, timestamp)}`,
          'x-timestamp': timestamp,
        },
        body,
        signal: AbortSignal.timeout(this.config.webhook.timeoutMs),
      });

      const text = await response.text().catch(() => '');

      return {
        succeeded: response.ok,
        statusCode: response.status,
        latencyMs: Date.now() - startedAt,
        error: response.ok ? null : `Received HTTP ${response.status}`,
        responseSnippet: text.slice(0, RESPONSE_SNIPPET_LIMIT) || null,
        permanent: WebhookClient.isPermanentStatus(response.status),
      };
    } catch (error) {
      // Network errors and timeouts are transient by nature.
      return {
        succeeded: false,
        statusCode: null,
        latencyMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : String(error),
        responseSnippet: null,
        permanent: false,
      };
    }
  }

  private static isPermanentStatus(status: number): boolean {
    if (status === 408 || status === 429) {
      return false;
    }

    return status >= 400 && status < 500;
  }
}
