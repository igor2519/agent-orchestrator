import { BaseLogger } from '@app/logger';
import { Injectable, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';

import { OutboxRelayService } from './outbox/outbox-relay.service';
import { AmqpConnection } from './rabbitmq/amqp-connection';
import { EventDispatcherService } from './rabbitmq/event-dispatcher.service';

/**
 * Starts and stops the transport around the application lifecycle.
 *
 * Consumers are registered before the relay starts publishing, and shutdown
 * closes channels so in-flight messages are redelivered rather than lost.
 */
@Injectable()
export class MessagingBootstrap implements OnApplicationBootstrap, OnApplicationShutdown {
  constructor(
    private readonly amqp: AmqpConnection,
    private readonly dispatcher: EventDispatcherService,
    private readonly relay: OutboxRelayService,
    private readonly logger: BaseLogger,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.amqp.connect();
    await this.dispatcher.start();
    this.relay.start();
    this.logger.log('Messaging started');
  }

  async onApplicationShutdown(): Promise<void> {
    this.relay.stop();
    await this.amqp.close();
    this.logger.log('Messaging stopped');
  }
}
