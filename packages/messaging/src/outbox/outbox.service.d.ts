import { OutboxRepository } from './outbox.repository';
import type { OutboxMessage } from './outbox-message.entity';
import type { EventPayloadMap, EventType, RoutingKey } from '@app/contracts';
import type { EntityManager } from 'typeorm';
export interface EnqueueOptions<TType extends EventType> {
    type: TType;
    documentId: string;
    payload: EventPayloadMap[TType];
    correlationId: string;
    causationId?: string | null;
    routingKey?: RoutingKey;
    availableAt?: Date;
    requestId?: string | null;
    attempt?: number;
}
export declare class OutboxService {
    private readonly repository;
    constructor(repository: OutboxRepository);
    enqueue<TType extends EventType>(manager: EntityManager, options: EnqueueOptions<TType>): Promise<OutboxMessage>;
}
//# sourceMappingURL=outbox.service.d.ts.map