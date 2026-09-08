import { EXCHANGE } from '@app/contracts';
import { BaseLogger } from '@app/logger';
import { Inject, Injectable } from '@nestjs/common';
import { connect } from 'amqplib';

import { MESSAGING_OPTIONS } from '../messaging.tokens';

import { assertTopology } from './topology';

import type { MessagingOptions } from '../messaging.tokens';
import type { AnyEventEnvelope, Queue } from '@app/contracts';
import type {
  Channel,
  ChannelModel,
  ConfirmChannel,
  ConsumeMessage,
  RecoveringChannelModel,
} from 'amqplib';

/** amqplib types the confirm callback's argument as `unknown`. */
const toError = (value: unknown): Error =>
  value instanceof Error ? value : new Error(typeof value === 'string' ? value : 'Publish failed');

export type RawMessageHandler = (envelope: AnyEventEnvelope, raw: ConsumeMessage) => Promise<void>;

/**
 * Owns the AMQP connection and both channels.
 *
 * Publishing uses a confirm channel: a message is only considered sent once the
 * broker acknowledges it, which is what lets the outbox relay safely mark a row
 * published. Consuming uses manual acknowledgement so a message is never lost
 * when a consumer dies mid-work.
 */
@Injectable()
export class AmqpConnection {
  private model?: RecoveringChannelModel;
  private publishChannel?: ConfirmChannel;
  private consumeChannel?: Channel;
  private readonly subscriptions = new Map<Queue, RawMessageHandler>();

  constructor(
    @Inject(MESSAGING_OPTIONS) private readonly options: MessagingOptions,
    private readonly logger: BaseLogger,
  ) {}

  async connect(): Promise<void> {
    // amqplib's recovery mode reconnects with its own backoff, and re-runs `setup`
    // on every successful connection so the topology survives a broker restart.
    this.model = await connect(this.options.url, {
      recovery: {
        setup: async (model: ChannelModel) => {
          const channel = await model.createChannel();
          await assertTopology(channel);
          await channel.close();
        },
      },
    });

    this.model.on('disconnect', (error) =>
      this.logger.warn('AMQP disconnected, recovery in progress', { error: String(error) }),
    );
    this.model.on('reconnect-scheduled', (info) =>
      this.logger.warn('AMQP reconnect scheduled', { attempt: info.attempt, delay: info.delay }),
    );
    // Channels do not survive a reconnect, so they are rebuilt and every
    // consumer is re-registered whenever the connection comes back.
    this.model.on('connect', () => {
      void this.openChannels().catch((error: unknown) =>
        this.logger.error('Failed to reopen AMQP channels after reconnect', error),
      );
    });

    await this.openChannels();
  }

  private async openChannels(): Promise<void> {
    if (!this.model) {
      throw new Error('AMQP connection has not been established');
    }

    this.publishChannel = await this.model.createConfirmChannel();
    this.consumeChannel = await this.model.createChannel();
    // Bound prefetch keeps one slow consumer from hoarding the whole queue.
    await this.consumeChannel.prefetch(this.options.prefetch);

    for (const [queue, handler] of this.subscriptions) {
      await this.startConsuming(queue, handler);
    }

    this.logger.log('AMQP channels ready', { prefetch: this.options.prefetch });
  }

  /**
   * Publishes persistently and resolves only once the broker confirms.
   * Rejecting on an unconfirmed publish is what keeps the outbox row unsent so it
   * is retried, rather than silently dropped.
   */
  async publish(routingKey: string, envelope: AnyEventEnvelope): Promise<void> {
    const channel = this.publishChannel;

    if (!channel) {
      throw new Error('AMQP publish channel is not open');
    }

    const content = Buffer.from(JSON.stringify(envelope));

    await new Promise<void>((resolve, reject) => {
      const accepted = channel.publish(
        EXCHANGE,
        routingKey,
        content,
        {
          persistent: true,
          contentType: 'application/json',
          messageId: envelope.id,
          correlationId: envelope.correlationId,
          type: envelope.type,
          timestamp: Date.now(),
          headers: {
            'x-causation-id': envelope.causationId ?? '',
            'x-document-id': envelope.documentId,
            'x-attempt': envelope.attempt,
          },
        },
        (error: unknown) => (error ? reject(toError(error)) : resolve()),
      );

      if (!accepted) {
        // Write buffer is full; wait for the broker to drain before continuing.
        channel.once('drain', () => undefined);
      }
    });
  }

  async subscribe(queue: Queue, handler: RawMessageHandler): Promise<void> {
    this.subscriptions.set(queue, handler);

    if (this.consumeChannel) {
      await this.startConsuming(queue, handler);
    }
  }

  private async startConsuming(queue: Queue, handler: RawMessageHandler): Promise<void> {
    const channel = this.consumeChannel;

    if (!channel) {
      return;
    }

    await channel.consume(
      queue,
      (message) => {
        if (!message) {
          return;
        }

        void this.handleMessage(queue, message, handler);
      },
      { noAck: false },
    );

    this.logger.log('Subscribed to queue', { queue });
  }

  private async handleMessage(
    queue: Queue,
    message: ConsumeMessage,
    handler: RawMessageHandler,
  ): Promise<void> {
    const channel = this.consumeChannel;

    if (!channel) {
      return;
    }

    let envelope: AnyEventEnvelope;

    try {
      envelope = JSON.parse(message.content.toString()) as AnyEventEnvelope;
    } catch (error) {
      // Unparseable content can never succeed on redelivery: park it immediately.
      this.logger.error('Discarding unparsable message', error, { queue });
      channel.nack(message, false, false);

      return;
    }

    try {
      await handler(envelope, message);
      // Acknowledged only after the handler's database transaction has committed.
      channel.ack(message);
    } catch (error) {
      this.logger.error('Handler failed, routing message to DLQ', error, {
        queue,
        eventId: envelope.id,
        eventType: envelope.type,
        correlationId: envelope.correlationId,
      });
      // `requeue: false` sends it to the DLQ rather than looping it back onto a
      // queue where it would fail identically and starve real work.
      channel.nack(message, false, false);
    }
  }

  async close(): Promise<void> {
    await this.consumeChannel?.close().catch(() => undefined);
    await this.publishChannel?.close().catch(() => undefined);
    await this.model?.close().catch(() => undefined);
  }
}
