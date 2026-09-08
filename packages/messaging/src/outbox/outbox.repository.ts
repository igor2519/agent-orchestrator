import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, IsNull, LessThanOrEqual, Not } from 'typeorm';

import { TransactionalRepository } from '../persistence/transactional.repository';

import { OutboxMessage } from './outbox-message.entity';

import type { DeepPartial, EntityManager } from 'typeorm';

@Injectable()
export class OutboxRepository extends TransactionalRepository<OutboxMessage> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(OutboxMessage, dataSource);
  }

  async add(manager: EntityManager, message: DeepPartial<OutboxMessage>): Promise<OutboxMessage> {
    const repository = this.scoped(manager);

    return repository.save(repository.create(message));
  }

  /**
   * Claims due rows with `FOR UPDATE SKIP LOCKED` so several instances of the same
   * service can relay concurrently without publishing a row twice.
   */
  async claimDue(batchSize: number): Promise<OutboxMessage[]> {
    return this.dataSource.transaction(async (manager) =>
      this.scoped(manager)
        .createQueryBuilder('outbox')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .where({ publishedAt: IsNull(), availableAt: LessThanOrEqual(new Date()) })
        .orderBy('outbox.available_at', 'ASC')
        .addOrderBy('outbox.sequence', 'ASC')
        .limit(batchSize)
        .getMany(),
    );
  }

  async markPublished(id: string, attempts: number): Promise<void> {
    await this.scoped().update({ id }, { publishedAt: new Date(), attempts, lastError: null });
  }

  async markFailed(id: string, attempts: number, error: string, availableAt: Date): Promise<void> {
    await this.scoped().update({ id }, { attempts, lastError: error, availableAt });
  }

  async countPending(): Promise<number> {
    return this.scoped().count({ where: { publishedAt: IsNull() } });
  }

  async countPublished(): Promise<number> {
    return this.scoped().count({ where: { publishedAt: Not(IsNull()) } });
  }

  async countFailing(): Promise<number> {
    return this.scoped().count({ where: { publishedAt: IsNull(), lastError: Not(IsNull()) } });
  }

  async findPending(limit: number): Promise<OutboxMessage[]> {
    return this.scoped().find({
      where: { publishedAt: IsNull() },
      order: { sequence: 'ASC' },
      take: limit,
    });
  }
}
