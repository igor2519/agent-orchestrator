import { TransactionalRepository } from '@app/messaging';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { IdempotencyKey } from '../entities/idempotency-key.entity';

import type { EntityManager } from 'typeorm';

@Injectable()
export class IdempotencyKeysRepository extends TransactionalRepository<IdempotencyKey> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(IdempotencyKey, dataSource);
  }

  findByKey(customerId: string, key: string): Promise<IdempotencyKey | null> {
    return this.scoped().findOne({ where: { customerId, key } });
  }

  async claim(
    manager: EntityManager,
    record: Pick<IdempotencyKey, 'customerId' | 'key' | 'requestFingerprint' | 'documentId'>,
  ): Promise<void> {
    await this.scoped(manager).insert(record);
  }
}
