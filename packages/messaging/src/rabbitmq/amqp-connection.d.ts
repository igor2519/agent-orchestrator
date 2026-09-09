import { BaseLogger } from '@app/logger';
import type { MessagingOptions } from '../messaging.tokens';
import type { AnyEventEnvelope, Queue } from '@app/contracts';
import type { ConsumeMessage } from 'amqplib';
export type RawMessageHandler = (envelope: AnyEventEnvelope, raw: ConsumeMessage) => Promise<void>;
export declare class AmqpConnection {
    private readonly options;
    private readonly logger;
    private model?;
    private publishChannel?;
    private consumeChannel?;
    private readonly subscriptions;
    constructor(options: MessagingOptions, logger: BaseLogger);
    connect(): Promise<void>;
    private openChannels;
    publish(routingKey: string, envelope: AnyEventEnvelope): Promise<void>;
    subscribe(queue: Queue, handler: RawMessageHandler): Promise<void>;
    private startConsuming;
    private handleMessage;
    close(): Promise<void>;
}
//# sourceMappingURL=amqp-connection.d.ts.map