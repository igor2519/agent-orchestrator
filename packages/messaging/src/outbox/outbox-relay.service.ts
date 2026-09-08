import { BaseLogger } from '@app/logger';
import { Inject, Injectable } from '@nestjs/common';
import { DataSource, IsNull, LessThanOrEqual } from 'typeorm';

import { MESSAGING_OPTIONS } from '../messaging.tokens';
import { AmqpConnection } from '../rabbitmq/amqp-connection';

import { OutboxMessage } from './outbox-message.entity';

import type { MessagingOptions } from '../messaging.tokens';

/**
 * Publishes committed outbox rows to RabbitMQ.
 *
 * Runs on a timer rather than in-process after commit, so events still leave the
 * service after a crash that happened between commit and publish - which is the
 * failure the outbox exists to survive.
 *
 * Rows are claimed with `FOR UPDATE SKIP LOCKED`, so several instances of the
 * same service can relay concurrently without publishing a row twice.
 */
@Injectable()
export class OutboxRelayService {
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    @Inject(MESSAGING_OPTIONS) private readonly options: MessagingOptions,
    private readonly dataSource: DataSource,
    private readonly amqp: AmqpConnection,
    private readonly logger: BaseLogger,
  ) {}

  start(): void {
    this.timer = setInterval(() => {
      void this.tick();
    }, this.options.relayIntervalMs);
    // Do not hold the event loop open purely for the relay during shutdown.
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  /** Exposed for tests and for an immediate flush after a submission. */
  async tick(): Promise<number> {
    if (this.running) {
      return 0;
    }

    this.running = true;

    try {
      return await this.publishDueMessages();
    } catch (error) {
      this.logger.error('Outbox relay tick failed', error);

      return 0;
    } finally {
      this.running = false;
    }
  }

  private async publishDueMessages(): Promise<number> {
    const due = await this.dataSource.transaction(async (manager) =>
      manager
        .createQueryBuilder(OutboxMessage, 'outbox')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .where({ publishedAt: IsNull(), availableAt: LessThanOrEqual(new Date()) })
        .orderBy('outbox.available_at', 'ASC')
        .addOrderBy('outbox.sequence', 'ASC')
        .limit(this.options.relayBatchSize)
        .getMany(),
    );

    let published = 0;

    for (const message of due) {
      const logger = this.logger.child({
        correlationId: message.correlationId,
        documentId: message.documentId,
        eventType: message.type,
        eventId: message.id,
      });

      try {
        await this.amqp.publish(message.routingKey, message.envelope);
        await this.dataSource.manager.update(
          OutboxMessage,
          { id: message.id },
          { publishedAt: new Date(), attempts: message.attempts + 1, lastError: null },
        );
        published += 1;
        logger.debug('Outbox message published');
      } catch (error) {
        await this.recordFailure(message, error, logger);
      }
    }

    return published;
  }

  private async recordFailure(
    message: OutboxMessage,
    error: unknown,
    logger: BaseLogger,
  ): Promise<void> {
    const attempts = message.attempts + 1;
    const exhausted = attempts >= this.options.relayMaxAttempts;

    await this.dataSource.manager.update(
      OutboxMessage,
      { id: message.id },
      {
        attempts,
        lastError: error instanceof Error ? error.message : String(error),
        // Park the row out of the polling window; it stays unpublished and
        // visible for an operator rather than being retried forever.
        availableAt: exhausted
          ? new Date(Date.now() + 24 * 60 * 60_000)
          : new Date(Date.now() + 5_000),
      },
    );

    if (exhausted) {
      logger.error('Outbox message exceeded publish attempts, parked for operator', error, {
        attempts,
      });
    } else {
      logger.warn('Outbox publish failed, will retry', { attempts });
    }
  }
}
