import { InboxRepository } from './inbox.repository';
import type { InboxMessage } from './inbox-message.entity';
import type { EntityManager } from 'typeorm';
export declare class InboxService {
    private readonly repository;
    constructor(repository: InboxRepository);
    hasProcessed(manager: EntityManager, eventId: string, consumer: string): Promise<boolean>;
    markProcessed(manager: EntityManager, eventId: string, consumer: string, type: string): Promise<void>;
    findByEventId(eventId: string): Promise<InboxMessage[]>;
}
//# sourceMappingURL=inbox.service.d.ts.map