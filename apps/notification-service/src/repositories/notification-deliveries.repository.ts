import { TransactionalRepository } from '@app/messaging';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual } from 'typeorm';

import { DeliveryStatus, NotificationDelivery } from '../entities/notification-delivery.entity';

import type { DeepPartial, EntityManager } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class NotificationDeliveriesRepository extends TransactionalRepository<NotificationDelivery> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(NotificationDelivery, dataSource);
  }

  findByDocumentAttemptChannel(
    manager: EntityManager,
    documentId: string,
    documentAttempt: number,
    channel: string,
  ): Promise<NotificationDelivery | null> {
    return this.scoped(manager).findOne({ where: { documentId, documentAttempt, channel } });
  }

  save(
    manager: EntityManager,
    delivery: DeepPartial<NotificationDelivery>,
  ): Promise<NotificationDelivery> {
    const repository = this.scoped(manager);

    return repository.save(repository.create(delivery));
  }

  /**
   * Claims due deliveries with `FOR UPDATE SKIP LOCKED`, so multiple instances can
   * run without sending the same webhook twice.
   */
  claimDue(batchSize: number): Promise<NotificationDelivery[]> {
    return this.dataSource.transaction(async (manager) =>
      this.scoped(manager)
        .createQueryBuilder('delivery')
        .setLock('pessimistic_write')
        .setOnLocked('skip_locked')
        .where({ status: DeliveryStatus.Pending, nextAttemptAt: LessThanOrEqual(new Date()) })
        .orderBy('delivery.next_attempt_at', 'ASC')
        .limit(batchSize)
        .getMany(),
    );
  }

  async update(
    manager: EntityManager,
    id: string,
    changes: QueryDeepPartialEntity<NotificationDelivery>,
  ): Promise<void> {
    await this.scoped(manager).update({ id }, changes);
  }
}
