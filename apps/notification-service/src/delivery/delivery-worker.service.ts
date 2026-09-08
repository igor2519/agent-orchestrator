import { EventType } from '@app/contracts';
import { BaseLogger } from '@app/logger';
import { OutboxService, nextAttemptAt } from '@app/messaging';
import { Inject, Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import envConfig from '../config/env.config';
import { DeliveryStatus } from '../entities/notification-delivery.entity';
import { DeliveryAttemptsRepository } from '../repositories/delivery-attempts.repository';
import { NotificationDeliveriesRepository } from '../repositories/notification-deliveries.repository';

import { WebhookClient } from './webhook-client';

import type { NotificationDelivery } from '../entities/notification-delivery.entity';
import type { DeliveryAttemptSummary } from '@app/contracts';
import type { ConfigType } from '@nestjs/config';
import type { EntityManager } from 'typeorm';

/**
 * Sends queued webhooks outside any consumer transaction.
 *
 * Each attempt is logged whatever the outcome, and the terminal result is
 * published back onto the exchange - carrying the whole attempt log - so the API
 * can show delivery outcomes without reading this service's database.
 */
@Injectable()
export class DeliveryWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly deliveries: NotificationDeliveriesRepository,
    private readonly attempts: DeliveryAttemptsRepository,
    private readonly webhooks: WebhookClient,
    private readonly outbox: OutboxService,
    private readonly logger: BaseLogger,
    @Inject(envConfig.KEY) private readonly config: ConfigType<typeof envConfig>,
  ) {}

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => {
      void this.tick();
    }, this.config.webhook.pollIntervalMs);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async tick(): Promise<number> {
    if (this.running) {
      return 0;
    }

    this.running = true;

    try {
      const due = await this.deliveries.claimDue(this.config.webhook.batchSize);

      for (const delivery of due) {
        await this.attemptDelivery(delivery);
      }

      return due.length;
    } catch (error) {
      this.logger.error('Delivery worker tick failed', error);

      return 0;
    } finally {
      this.running = false;
    }
  }

  private async attemptDelivery(delivery: NotificationDelivery): Promise<void> {
    const attemptNumber = delivery.attempts + 1;
    const logger = this.logger.child({
      correlationId: delivery.correlationId,
      documentId: delivery.documentId,
      deliveryId: delivery.id,
      attempt: attemptNumber,
    });

    // The network call happens here, deliberately outside a transaction.
    const result = await this.webhooks.send(delivery.callbackUrl, delivery.payload);
    const giveUp = result.permanent || attemptNumber >= this.config.webhook.maxAttempts;

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

      const attemptLog = await this.buildAttemptLog(manager, delivery.id);

      if (result.succeeded) {
        await this.deliveries.update(manager, delivery.id, {
          status: DeliveryStatus.Delivered,
          attempts: attemptNumber,
          lastStatusCode: result.statusCode,
          lastError: null,
          deliveredAt: new Date(),
        });

        await this.outbox.enqueue(manager, {
          type: EventType.NotificationDelivered,
          documentId: delivery.documentId,
          correlationId: delivery.correlationId,
          attempt: delivery.documentAttempt,
          payload: {
            deliveryId: delivery.id,
            callbackUrl: delivery.callbackUrl,
            statusCode: result.statusCode ?? 200,
            attempts: attemptNumber,
            attemptLog,
          },
        });

        return;
      }

      if (giveUp) {
        await this.deliveries.update(manager, delivery.id, {
          status: DeliveryStatus.Undeliverable,
          attempts: attemptNumber,
          lastStatusCode: result.statusCode,
          lastError: result.error,
        });

        await this.outbox.enqueue(manager, {
          type: EventType.NotificationFailed,
          documentId: delivery.documentId,
          correlationId: delivery.correlationId,
          attempt: delivery.documentAttempt,
          payload: {
            deliveryId: delivery.id,
            callbackUrl: delivery.callbackUrl,
            reason: result.error ?? 'Delivery failed',
            attempts: attemptNumber,
            attemptLog,
          },
        });

        return;
      }

      await this.deliveries.update(manager, delivery.id, {
        attempts: attemptNumber,
        lastStatusCode: result.statusCode,
        lastError: result.error,
        nextAttemptAt: nextAttemptAt(attemptNumber),
      });
    });

    if (result.succeeded) {
      logger.log('Webhook delivered', { statusCode: result.statusCode });
    } else if (giveUp) {
      logger.error('Webhook permanently undeliverable', result.error, {
        statusCode: result.statusCode,
        permanent: result.permanent,
      });
    } else {
      logger.warn('Webhook delivery failed, will retry', { statusCode: result.statusCode });
    }
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
