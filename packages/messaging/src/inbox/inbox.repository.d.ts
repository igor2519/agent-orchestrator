import { DataSource } from 'typeorm';
import { TransactionalRepository } from '../persistence/transactional.repository';
import { InboxMessage } from './inbox-message.entity';
import type { EntityManager } from 'typeorm';
export declare class InboxRepository extends TransactionalRepository<InboxMessage> {
    constructor(dataSource: DataSource);
    exists(manager: EntityManager, eventId: string, consumer: string): Promise<boolean>;
    record(manager: EntityManager, eventId: string, consumer: string, type: string): Promise<void>;
    findByEventId(eventId: string): Promise<InboxMessage[]>;
}
//# sourceMappingURL=inbox.repository.d.ts.map