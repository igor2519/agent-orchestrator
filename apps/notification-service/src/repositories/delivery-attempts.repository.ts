import { TransactionalRepository } from '@app/messaging';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { DeliveryAttempt } from '../entities/delivery-attempt.entity';

import type { DeepPartial, EntityManager } from 'typeorm';

@Injectable()
export class DeliveryAttemptsRepository extends TransactionalRepository<DeliveryAttempt> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(DeliveryAttempt, dataSource);
  }

  save(manager: EntityManager, attempt: DeepPartial<DeliveryAttempt>): Promise<DeliveryAttempt> {
    const repository = this.scoped(manager);

    return repository.save(repository.create(attempt));
  }

  findByDelivery(manager: EntityManager, deliveryId: string): Promise<DeliveryAttempt[]> {
    return this.scoped(manager).find({
      where: { deliveryId },
      order: { attemptNumber: 'ASC' },
    });
  }
}
