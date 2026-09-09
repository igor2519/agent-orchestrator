import { DataSource } from 'typeorm';
import { TransactionalRepository } from '../persistence/transactional.repository';
import { OutboxMessage } from './outbox-message.entity';
import type { DeepPartial, EntityManager } from 'typeorm';
export declare class OutboxRepository extends TransactionalRepository<OutboxMessage> {
    constructor(dataSource: DataSource);
    add(manager: EntityManager, message: DeepPartial<OutboxMessage>): Promise<OutboxMessage>;
    claimDue(batchSize: number): Promise<OutboxMessage[]>;
    markPublished(id: string, attempts: number): Promise<void>;
    markFailed(id: string, attempts: number, error: string, availableAt: Date): Promise<void>;
    countPending(): Promise<number>;
    countPublished(): Promise<number>;
    countFailing(): Promise<number>;
    findPending(limit: number): Promise<OutboxMessage[]>;
}
//# sourceMappingURL=outbox.repository.d.ts.map