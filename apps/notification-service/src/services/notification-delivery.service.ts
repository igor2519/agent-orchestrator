import { EventType } from '@app/contracts';
import { BaseLogger } from '@app/logger';
import { OutboxService, nextAttemptAt } from '@app/messaging';
import { Inject, Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import envConfig from '../config/env.config';
import { DeliveryStatus } from '../entities/notification-delivery.entity';
import { NotificationChannel, deliveryFailure } from '../providers/base-notification-provider';
import { NotificationProviderRegistry } from '../providers/notification-provider.registry';
import { DeliveryAttemptsRepository } from '../repositories/delivery-attempts.repository';
import { NotificationDeliveriesRepository } from '../repositories/notification-deliveries.repository';

import type { NotificationDelivery } from '../entities/notification-delivery.entity';
import type { NotificationDeliveryResult } from '../providers/base-notification-provider';
import type { DeliveryAttemptSummary } from '@app/contracts';
import type { ConfigType } from '@nestjs/config';
import type { EntityManager } from 'typeorm';

export const DeliveryOutcome = {
  Delivered: 'DELIVERED',
  Retrying: 'RETRYING',
  Undeliverable: 'UNDELIVERABLE',
} as const;

export type DeliveryOutcome = (typeof DeliveryOutcome)[keyof typeof DeliveryOutcome];

/**
 * Executes a delivery using the provider that owns its channel.
 *
 * The providers are the strategies - each knows only how to put a payload on its
 * transport. Everything a delivery needs regardless of channel lives here exactly
 * once: choosing the strategy, logging the attempt, deciding retry versus give-up,
 * setting the terminal status and publishing the outcome. That is why adding a
 * channel touches nothing in this file.
 */
@Injectable()
export class NotificationDeliveryService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly providers: NotificationProviderRegistry,
    private readonly deliveries: NotificationDeliveriesRepository,
    private readonly attempts: DeliveryAttemptsRepository,
    private readonly outbox: OutboxService,
    private readonly logger: BaseLogger,
    @Inject(envConfig.KEY) private readonly config: ConfigType<typeof envConfig>,
  ) {}

  claimDue(batchSize: number): Promise<NotificationDelivery[]> {
    return this.deliveries.claimDue(batchSize);
  }

  /** Resolves the strategy for this delivery's channel and runs it. */
  private async deliver(delivery: NotificationDelivery): Promise<NotificationDeliveryResult> {
    const provider = this.providers.byChannel(delivery.channel as NotificationChannel);

    if (!provider) {
      return deliveryFailure(`No provider registered for channel "${delivery.channel}"`, true);
    }

    return provider.deliver(delivery);
  }

  /** One full attempt: deliver, record it, and advance or finish the delivery. */
  async attempt(delivery: NotificationDelivery): Promise<DeliveryOutcome> {
    const attemptNumber = delivery.attempts + 1;
    const logger = this.logger.child({
      correlationId: delivery.correlationId,
      documentId: delivery.documentId,
      deliveryId: delivery.id,
      channel: delivery.channel,
      attempt: attemptNumber,
    });

    const result = await this.deliver(delivery);
    const outcome: DeliveryOutcome = result.succeeded
      ? DeliveryOutcome.Delivered
      : result.permanent || attemptNumber >= this.config.webhook.maxAttempts
        ? DeliveryOutcome.Undeliverable
        : DeliveryOutcome.Retrying;

    await this.dataSource.transaction(async (manager) => {
      await this.attempts.save(manager, {
        deliveryId: delivery.id,
        attemptNumber,
        statusCode: result.statusCode,
        latencyMs: result.latencyMs,
        succeeded: result.succeeded,
        error: result.error,
        responseSnippet: result.responseSnippet,
      });

      if (outcome === DeliveryOutcome.Retrying) {
        await this.deliveries.update(manager, delivery.id, {
          attempts: attemptNumber,
          lastStatusCode: result.statusCode,
          lastError: result.error,
          nextAttemptAt: nextAttemptAt(attemptNumber),
        });

        return;
      }

      const attemptLog = await this.buildAttemptLog(manager, delivery.id);

      await this.deliveries.update(manager, delivery.id, {
        status:
          outcome === DeliveryOutcome.Delivered
            ? DeliveryStatus.Delivered
            : DeliveryStatus.Undeliverable,
        attempts: attemptNumber,
        lastStatusCode: result.statusCode,
        lastError: outcome === DeliveryOutcome.Delivered ? null : result.error,
        deliveredAt: outcome === DeliveryOutcome.Delivered ? new Date() : null,
      });

      // Only the customer-facing webhook reports its outcome onto the exchange;
      // the websocket channel is itself driven by an event and would otherwise
      // announce its own delivery in a loop.
      if (delivery.channel !== NotificationChannel.Webhook) {
        return;
      }

      await this.outbox.enqueue(manager, {
        type:
          outcome === DeliveryOutcome.Delivered
            ? EventType.NotificationDelivered
            : EventType.NotificationFailed,
        documentId: delivery.documentId,
        correlationId: delivery.correlationId,
        attempt: delivery.documentAttempt,
        payload:
          outcome === DeliveryOutcome.Delivered
            ? {
                deliveryId: delivery.id,
                callbackUrl: delivery.callbackUrl ?? '',
                statusCode: result.statusCode ?? 200,
                attempts: attemptNumber,
                attemptLog,
              }
            : {
                deliveryId: delivery.id,
                callbackUrl: delivery.callbackUrl ?? '',
                reason: result.error ?? 'Delivery failed',
                attempts: attemptNumber,
                attemptLog,
              },
      });
    });

    if (outcome === DeliveryOutcome.Delivered) {
      logger.log('Notification delivered', { statusCode: result.statusCode });
    } else if (outcome === DeliveryOutcome.Undeliverable) {
      logger.error('Notification permanently undeliverable', result.error, {
        statusCode: result.statusCode,
        permanent: result.permanent,
      });
    } else {
      logger.warn('Notification delivery failed, will retry', { statusCode: result.statusCode });
    }

    return outcome;
  }

  private async buildAttemptLog(
    manager: EntityManager,
    deliveryId: string,
  ): Promise<DeliveryAttemptSummary[]> {
    const attempts = await this.attempts.findByDelivery(manager, deliveryId);

    return attempts.map((attempt) => ({
      attemptNumber: attempt.attemptNumber,
      statusCode: attempt.statusCode,
      succeeded: attempt.succeeded,
      latencyMs: attempt.latencyMs,
      error: attempt.error,
      at: (attempt.createdAt ?? new Date()).toISOString(),
    }));
  }
}
