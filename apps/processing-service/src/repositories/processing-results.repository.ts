import { TransactionalRepository } from '@app/messaging';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { ProcessingResult } from '../entities/processing-result.entity';

import type { DeepPartial, EntityManager } from 'typeorm';

@Injectable()
export class ProcessingResultsRepository extends TransactionalRepository<ProcessingResult> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(ProcessingResult, dataSource);
  }

  /** Business-level idempotency guard, independent of the inbox. */
  findByAttempt(
    manager: EntityManager,
    documentId: string,
    attempt: number,
  ): Promise<ProcessingResult | null> {
    return this.scoped(manager).findOne({ where: { documentId, attempt } });
  }

  save(manager: EntityManager, result: DeepPartial<ProcessingResult>): Promise<ProcessingResult> {
    const repository = this.scoped(manager);

    return repository.save(repository.create(result));
  }

  findByDocument(documentId: string): Promise<ProcessingResult[]> {
    return this.scoped().find({ where: { documentId }, order: { attempt: 'ASC' } });
  }
}
