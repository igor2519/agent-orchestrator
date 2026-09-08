import { BaseLogger } from '@app/logger';
import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { getSubscriptions, isMessageController } from '../event-controller';
import { InboxService } from '../inbox/inbox.service';
import { EVENT_CONTROLLERS, MESSAGING_OPTIONS } from '../messaging.tokens';

import { AmqpConnection } from './amqp-connection';

import type { EventControllerMethod, MessagingOptions } from '../messaging.tokens';
import type { AnyEventEnvelope, EventType } from '@app/contracts';

interface Route {
  controller: string;
  method: EventControllerMethod;
}

/**
 * Routes an incoming AMQP message to the `@OnEvent` methods that subscribed to it,
 * inside one database transaction.
 *
 * The ordering here is the whole reliability story:
 *   1. open a transaction
 *   2. skip if the inbox already contains this event id (duplicate)
 *   3. invoke every subscribed controller method - their writes and any outbox
 *      rows join this same transaction
 *   4. record the event in the inbox
 *   5. commit, and only then acknowledge to RabbitMQ
 *
 * A crash before step 5 leaves the message unacknowledged and the transaction
 * rolled back, so redelivery repeats the work cleanly. A crash between commit and
 * ack causes a redelivery that step 2 discards.
 */
@Injectable()
export class EventDispatcherService {
  private readonly routes = new Map<EventType, Route[]>();

  constructor(
    @Inject(MESSAGING_OPTIONS) private readonly options: MessagingOptions,
    @Inject(EVENT_CONTROLLERS) private readonly controllers: object[],
    private readonly dataSource: DataSource,
    private readonly inbox: InboxService,
    private readonly amqp: AmqpConnection,
    private readonly logger: BaseLogger,
  ) {}

  async start(): Promise<void> {
    this.buildRoutingTable();

    const { queue } = this.options;

    if (!queue) {
      return;
    }

    await this.amqp.subscribe(queue, (envelope) => this.dispatch(envelope));
  }

  /**
   * Reads `@OnEvent` metadata once at startup, so per-message dispatch is a map
   * lookup rather than repeated reflection.
   */
  private buildRoutingTable(): void {
    for (const controller of this.controllers) {
      if (!isMessageController(controller)) {
        this.logger.warn('Provider is not a @MessageController, skipping', {
          provider: controller.constructor.name,
        });
        continue;
      }

      for (const { methodName, eventTypes } of getSubscriptions(controller)) {
        const method = (controller as Record<string, unknown>)[methodName];

        if (typeof method !== 'function') {
          continue;
        }

        for (const eventType of eventTypes) {
          const routes = this.routes.get(eventType) ?? [];

          routes.push({
            controller: controller.constructor.name,
            method: (method as EventControllerMethod).bind(controller),
          });
          this.routes.set(eventType, routes);
        }
      }
    }

    this.logger.log('Event routes registered', {
      routes: [...this.routes.entries()].map(
        ([type, routes]) => `${type} -> ${routes.map((r) => r.controller).join(',')}`,
      ),
    });
  }

  private async dispatch(envelope: AnyEventEnvelope): Promise<void> {
    const { queue } = this.options;

    if (!queue) {
      return;
    }

    const logger = this.logger.child({
      correlationId: envelope.correlationId,
      causationId: envelope.id,
      documentId: envelope.documentId,
      eventType: envelope.type,
      attempt: envelope.attempt,
    });

    const routes = this.routes.get(envelope.type) ?? [];

    if (routes.length === 0) {
      logger.debug('No controller subscribed to event, acknowledging');

      return;
    }

    await this.dataSource.transaction(async (manager) => {
      if (await this.inbox.hasProcessed(manager, envelope.id, queue)) {
        logger.debug('Duplicate event ignored');

        return;
      }

      for (const route of routes) {
        await route.method({ manager, envelope, logger });
      }

      await this.inbox.markProcessed(manager, envelope.id, queue, envelope.type);
    });

    logger.log('Event processed');
  }
}
