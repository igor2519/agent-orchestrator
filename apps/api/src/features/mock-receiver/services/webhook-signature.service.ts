import { createHmac, timingSafeEqual } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import envConfig from 'src/config/env.config';

import type { ConfigType } from '@nestjs/config';

/**
 * Verifies the signature the notification service attaches to each webhook.
 *
 * Kept deliberately separate from that service: this is the *receiver* side, and
 * a real customer would implement exactly this much.
 */
@Injectable()
export class WebhookSignatureService {
  constructor(@Inject(envConfig.KEY) private readonly config: ConfigType<typeof envConfig>) {}

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
}
