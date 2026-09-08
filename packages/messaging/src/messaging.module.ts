import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InboxMessage } from './inbox/inbox-message.entity';
import { InboxService } from './inbox/inbox.service';
import { MessagingOpsController } from './messaging-ops.controller';
import { MessagingBootstrap } from './messaging.bootstrap';
import { EVENT_CONTROLLERS, MESSAGING_OPTIONS } from './messaging.tokens';
import { OutboxMessage } from './outbox/outbox-message.entity';
import { OutboxRelayService } from './outbox/outbox-relay.service';
import { OutboxService } from './outbox/outbox.service';
import { AmqpConnection } from './rabbitmq/amqp-connection';
import { EventDispatcherService } from './rabbitmq/event-dispatcher.service';

import type { MessagingOptions } from './messaging.tokens';
import type { DynamicModule, Type } from '@nestjs/common';

export interface MessagingModuleOptions extends MessagingOptions {
  /**
   * `@MessageController` classes this service contributes to the choreography.
   * They are resolved through DI and grouped under one multi-provider token, so a
   * new reaction is added by listing a class here - no dispatch code changes.
   */
  controllers?: Type<unknown>[];
  /** Extra providers the controllers depend on. */
  imports?: DynamicModule['imports'];
  /**
   * Mounts the HTTP operations controller. Only the API service serves HTTP;
   * worker services run as application contexts with no listener.
   */
  exposeOpsController?: boolean;
}

@Module({})
export class MessagingModule {
  static forRoot(options: MessagingModuleOptions): DynamicModule {
    const controllers = options.controllers ?? [];

    return {
      module: MessagingModule,
      // Configured once per service via forRoot, so its exports behave like
      // ConfigModule's: available anywhere without re-importing the dynamic module
      // (which would otherwise create import cycles with feature modules).
      global: true,
      imports: [
        TypeOrmModule.forFeature([OutboxMessage, InboxMessage]),
        ...(options.imports ?? []),
      ],
      // Only the API serves HTTP; worker services run as application contexts and
      // register no controllers at all.
      controllers: options.exposeOpsController ? [MessagingOpsController] : [],
      providers: [
        { provide: MESSAGING_OPTIONS, useValue: MessagingModule.toOptions(options) },
        ...controllers,
        {
          provide: EVENT_CONTROLLERS,
          useFactory: (...resolved: unknown[]) => resolved,
          inject: controllers,
        },
        AmqpConnection,
        InboxService,
        OutboxService,
        OutboxRelayService,
        EventDispatcherService,
        MessagingBootstrap,
      ],
      exports: [OutboxService, OutboxRelayService, AmqpConnection, MESSAGING_OPTIONS],
    };
  }

  private static toOptions(options: MessagingModuleOptions): MessagingOptions {
    return {
      url: options.url,
      queue: options.queue,
      prefetch: options.prefetch,
      relayIntervalMs: options.relayIntervalMs,
      relayBatchSize: options.relayBatchSize,
      relayMaxAttempts: options.relayMaxAttempts,
    };
  }
}
