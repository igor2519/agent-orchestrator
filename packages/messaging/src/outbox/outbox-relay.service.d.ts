import { BaseLogger } from '@app/logger';
import { AmqpConnection } from '../rabbitmq/amqp-connection';
import { OutboxRepository } from './outbox.repository';
import type { MessagingOptions } from '../messaging.tokens';
export declare class OutboxRelayService {
    private readonly options;
    private readonly repository;
    private readonly amqp;
    private readonly logger;
    private timer?;
    private running;
    constructor(options: MessagingOptions, repository: OutboxRepository, amqp: AmqpConnection, logger: BaseLogger);
    start(): void;
    stop(): void;
    tick(): Promise<number>;
    private publishDueMessages;
    private recordFailure;
}
//# sourceMappingURL=outbox-relay.service.d.ts.map