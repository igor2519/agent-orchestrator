import { createHmac } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import envConfig from '../config/env.config';

import {
  BaseNotificationProvider,
  NotificationChannel,
  deliveryFailure,
} from './base-notification-provider';

import type {
  NotificationCandidate,
  NotificationDeliveryResult,
} from './base-notification-provider';
import type { NotificationDelivery } from '../entities/notification-delivery.entity';
import type { ConfigType } from '@nestjs/config';

const RESPONSE_SNIPPET_LIMIT = 512;

/**
 * Delivers a notification as a signed HTTP POST to the customer's endpoint.
 *
 * The whole channel lives here - signing, the request, and how a response maps to
 * a retry decision - because those three only make sense together. Everything
 * around delivery (attempt logging, backoff, terminal status) is the delivery
 * service's job and is shared with every other channel.
 */
@Injectable()
export class WebhookProvider extends BaseNotificationProvider {
  readonly channel = NotificationChannel.Webhook;

  constructor(@Inject(envConfig.KEY) private readonly config: ConfigType<typeof envConfig>) {
    super();
  }

  /** Nothing to deliver to without a callback target. */
  supports(candidate: NotificationCandidate): boolean {
    return Boolean(candidate.callbackUrl);
  }

  async deliver(delivery: NotificationDelivery): Promise<NotificationDeliveryResult> {
    if (!delivery.callbackUrl) {
      return deliveryFailure('Delivery has no callback URL', true);
    }

    const body = JSON.stringify(delivery.payload);
    const timestamp = Date.now().toString();
    const startedAt = Date.now();

    try {
      const response = await fetch(delivery.callbackUrl, {
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
        permanent: WebhookProvider.isPermanentStatus(response.status),
      };
    } catch (error) {
      // Network errors and timeouts are transient by nature.
      return deliveryFailure(
        error instanceof Error ? error.message : String(error),
        false,
        Date.now() - startedAt,
      );
    }
  }

  /**
   * Signs the body so the receiver can prove it came from us and was not replayed.
   * The timestamp is inside the signed material, so a captured request cannot be
   * replayed later without invalidating the signature.
   */
  private sign(body: string, timestamp: string): string {
    return createHmac('sha256', this.config.webhook.signingSecret)
      .update(`${timestamp}.${body}`)
      .digest('hex');
  }

  /** 4xx means the customer rejected the payload; retrying would only repeat it. */
  private static isPermanentStatus(status: number): boolean {
    if (status === 408 || status === 429) {
      return false;
    }

    return status >= 400 && status < 500;
  }
}
