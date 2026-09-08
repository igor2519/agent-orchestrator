import { BaseLogger } from '@app/logger';
import { Inject, Injectable } from '@nestjs/common';

import { MESSAGING_OPTIONS } from '../messaging.tokens';
import { AmqpConnection } from '../rabbitmq/amqp-connection';

import { OutboxRepository } from './outbox.repository';

import type { OutboxMessage } from './outbox-message.entity';
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
    private readonly repository: OutboxRepository,
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
    const due = await this.repository.claimDue(this.options.relayBatchSize);
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
        await this.repository.markPublished(message.id, message.attempts + 1);
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
    // Park an exhausted row far outside the polling window: it stays unpublished
    // and visible to an operator instead of being retried forever.
    const availableAt = new Date(Date.now() + (exhausted ? 24 * 60 * 60_000 : 5_000));

    await this.repository.markFailed(
      message.id,
      attempts,
      error instanceof Error ? error.message : String(error),
      availableAt,
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
