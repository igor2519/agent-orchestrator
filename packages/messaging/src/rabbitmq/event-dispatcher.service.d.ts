import { BaseLogger } from '@app/logger';
import { DataSource } from 'typeorm';
import { InboxService } from '../inbox/inbox.service';
import { AmqpConnection } from './amqp-connection';
import type { MessagingOptions } from '../messaging.tokens';
export declare class EventDispatcherService {
    private readonly options;
    private readonly controllers;
    private readonly dataSource;
    private readonly inbox;
    private readonly amqp;
    private readonly logger;
    private readonly routes;
    constructor(options: MessagingOptions, controllers: object[], dataSource: DataSource, inbox: InboxService, amqp: AmqpConnection, logger: BaseLogger);
    start(): Promise<void>;
    private buildRoutingTable;
    private dispatch;
    private handleInTransaction;
}
//# sourceMappingURL=event-dispatcher.service.d.ts.map