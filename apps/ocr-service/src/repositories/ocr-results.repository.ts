import { TransactionalRepository } from '@app/messaging';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { OcrResult } from '../entities/ocr-result.entity';

import type { DeepPartial, EntityManager } from 'typeorm';

@Injectable()
export class OcrResultsRepository extends TransactionalRepository<OcrResult> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(OcrResult, dataSource);
  }

  /** Business-level idempotency guard, independent of the inbox. */
  findByAttempt(
    manager: EntityManager,
    documentId: string,
    attempt: number,
  ): Promise<OcrResult | null> {
    return this.scoped(manager).findOne({ where: { documentId, attempt } });
  }

  save(manager: EntityManager, result: DeepPartial<OcrResult>): Promise<OcrResult> {
    const repository = this.scoped(manager);

    return repository.save(repository.create(result));
  }

  findByDocument(documentId: string): Promise<OcrResult[]> {
    return this.scoped().find({ where: { documentId }, order: { attempt: 'ASC' } });
  }
}
