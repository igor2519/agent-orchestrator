import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { TransactionalRepository } from '../persistence/transactional.repository';

import { InboxMessage } from './inbox-message.entity';

import type { EntityManager } from 'typeorm';

@Injectable()
export class InboxRepository extends TransactionalRepository<InboxMessage> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(InboxMessage, dataSource);
  }

  async exists(manager: EntityManager, eventId: string, consumer: string): Promise<boolean> {
    const existing = await this.scoped(manager).findOne({
      where: { eventId, consumer },
      select: { eventId: true },
    });

    return existing !== null;
  }

  /**
   * `ON CONFLICT DO NOTHING` so two concurrent deliveries of the same message
   * cannot both insert; the loser simply finds the row already there.
   */
  async record(
    manager: EntityManager,
    eventId: string,
    consumer: string,
    type: string,
  ): Promise<void> {
    await this.scoped(manager)
      .createQueryBuilder()
      .insert()
      .values({ eventId, consumer, type })
      .orIgnore()
      .execute();
  }

  async findByEventId(eventId: string): Promise<InboxMessage[]> {
    return this.scoped().find({ where: { eventId } });
  }
}
