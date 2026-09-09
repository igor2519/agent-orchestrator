import { BaseLogger } from '@app/logger';
import { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { OutboxRelayService } from './outbox/outbox-relay.service';
import { AmqpConnection } from './rabbitmq/amqp-connection';
import { EventDispatcherService } from './rabbitmq/event-dispatcher.service';
export declare class MessagingBootstrap implements OnApplicationBootstrap, OnApplicationShutdown {
    private readonly amqp;
    private readonly dispatcher;
    private readonly relay;
    private readonly logger;
    constructor(amqp: AmqpConnection, dispatcher: EventDispatcherService, relay: OutboxRelayService, logger: BaseLogger);
    onApplicationBootstrap(): Promise<void>;
    onApplicationShutdown(): Promise<void>;
}
//# sourceMappingURL=messaging.bootstrap.d.ts.map