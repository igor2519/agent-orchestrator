import { EventType } from '@app/contracts';
import { BaseLogger } from '@app/logger';
import { OutboxService, nextAttemptAt } from '@app/messaging';
import { Inject, Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual } from 'typeorm';

import envConfig from '../config/env.config';
import { DeliveryAttempt } from '../entities/delivery-attempt.entity';
import { DeliveryStatus, NotificationDelivery } from '../entities/notification-delivery.entity';

import { WebhookClient } from './webhook-client';

import type { DeliveryAttemptSummary } from '@app/contracts';
import type { ConfigType } from '@nestjs/config';
import type { EntityManager } from 'typeorm';

/**
 * Sends queued webhooks outside any consumer transaction.
 *
 * Deliveries are claimed with `FOR UPDATE SKIP LOCKED`, so multiple instances can
 * run without sending the same webhook twice. Each attempt is logged whatever the
 * outcome, and the terminal result is published back onto the exchange so the API
 * can show it.
 */
@Injectable()
export class DeliveryWorker implements OnApplicationBootstrap, OnApplicationShutdown {
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
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
      const due = await this.claimDue();
      let processed = 0;

      for (const delivery of due) {
        await this.attemptDelivery(delivery);
        processed += 1;
      }

      return processed;
    } catch (error) {
      this.logger.error('Delivery worker tick failed', error);

      return 0;
    } finally {
      this.running = false;
    }
  }

  /** Full attempt history for the delivery, newest write included. */
  private static async buildAttemptLog(
    manager: EntityManager,
    deliveryId: string,
    latest: DeliveryAttempt,
  ): Promise<DeliveryAttemptSummary[]> {
    const attempts = await manager.find(DeliveryAttempt, {
      where: { deliveryId },
      order: { attemptNumber: 'ASC' },
    });
    const all = attempts.some((a) => a.id === latest.id) ? attempts : [...attempts, latest];

    return all.map((a) => ({
      attemptNumber: a.attemptNumber,
      statusCode: a.statusCode,
      succeeded: a.succeeded,
      latencyMs: a.latencyMs,
      error: a.error,
      at: (a.createdAt ?? new Date()).toISOString(),
    }));
  }

  private async claimDue(): Promise<NotificationDelivery[]> {
    return this.dataSource.transaction(async (manager) =>
      manager
        .createQueryBuilder(NotificationDelivery, 'delivery')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .where({ status: DeliveryStatus.Pending, nextAttemptAt: LessThanOrEqual(new Date()) })
        .orderBy('delivery.next_attempt_at', 'ASC')
        .limit(this.config.webhook.batchSize)
        .getMany(),
    );
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
    const exhausted = attemptNumber >= this.config.webhook.maxAttempts;
    const giveUp = result.permanent || exhausted;

    await this.dataSource.transaction(async (manager) => {
      const attempt = await manager.save(
        DeliveryAttempt,
        manager.create(DeliveryAttempt, {
          deliveryId: delivery.id,
          attemptNumber,
          statusCode: result.statusCode,
          latencyMs: result.latencyMs,
          succeeded: result.succeeded,
          error: result.error,
          responseSnippet: result.responseSnippet,
        }),
      );

      const attemptLog = await DeliveryWorker.buildAttemptLog(manager, delivery.id, attempt);

      if (result.succeeded) {
        await manager.update(
          NotificationDelivery,
          { id: delivery.id },
          {
            status: DeliveryStatus.Delivered,
            attempts: attemptNumber,
            lastStatusCode: result.statusCode,
            lastError: null,
            deliveredAt: new Date(),
          },
        );

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
        await manager.update(
          NotificationDelivery,
          { id: delivery.id },
          {
            status: DeliveryStatus.Undeliverable,
            attempts: attemptNumber,
            lastStatusCode: result.statusCode,
            lastError: result.error,
          },
        );

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

      await manager.update(
        NotificationDelivery,
        { id: delivery.id },
        {
          attempts: attemptNumber,
          lastStatusCode: result.statusCode,
          lastError: result.error,
          nextAttemptAt: nextAttemptAt(attemptNumber),
        },
      );
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
}
