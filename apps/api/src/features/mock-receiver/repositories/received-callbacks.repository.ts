import { TransactionalRepository } from '@app/messaging';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { ReceivedCallback } from '../entities/received-callback.entity';

import type { DeepPartial } from 'typeorm';

@Injectable()
export class ReceivedCallbacksRepository extends TransactionalRepository<ReceivedCallback> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(ReceivedCallback, dataSource);
  }

  save(callback: DeepPartial<ReceivedCallback>): Promise<ReceivedCallback> {
    const repository = this.scoped();

    return repository.save(repository.create(callback));
  }

  findRecent(documentId: string | undefined, limit: number): Promise<ReceivedCallback[]> {
    return this.scoped().find({
      where: documentId ? { documentId } : {},
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
