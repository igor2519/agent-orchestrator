import { DocumentStatus } from '@app/contracts';
import { TransactionalRepository } from '@app/messaging';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Between, DataSource, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

import { Document } from '../entities/document.entity';

import type { ListDocumentsInput } from '../joi-validations';
import type { DeepPartial, EntityManager, FindOptionsWhere } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class DocumentsRepository extends TransactionalRepository<Document> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(Document, dataSource);
  }

  save(manager: EntityManager, document: DeepPartial<Document>): Promise<Document> {
    const repository = this.scoped(manager);

    return repository.save(repository.create(document));
  }

  findById(id: string, manager?: EntityManager): Promise<Document | null> {
    return this.scoped(manager).findOne({ where: { id } });
  }

  async applyProjection(
    manager: EntityManager,
    id: string,
    changes: QueryDeepPartialEntity<Document>,
  ): Promise<number> {
    const result = await this.scoped(manager).update({ id }, changes);

    return result.affected ?? 0;
  }

  /**
   * Guarding on the current status makes the transition atomic: a second concurrent
   * retry updates zero rows instead of starting a duplicate flow.
   */
  async transitionFrom(
    manager: EntityManager,
    id: string,
    from: DocumentStatus,
    changes: QueryDeepPartialEntity<Document>,
  ): Promise<number> {
    const result = await this.scoped(manager).update({ id, status: from }, changes);

    return result.affected ?? 0;
  }

  async search(query: ListDocumentsInput): Promise<[Document[], number]> {
    const where: FindOptionsWhere<Document> = {};

    if (query.customerId) {
      where.customerId = query.customerId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.submittedFrom && query.submittedTo) {
      where.createdAt = Between(query.submittedFrom, query.submittedTo);
    } else if (query.submittedFrom) {
      where.createdAt = MoreThanOrEqual(query.submittedFrom);
    } else if (query.submittedTo) {
      where.createdAt = LessThanOrEqual(query.submittedTo);
    }

    return this.scoped().findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take: query.limit,
      skip: query.offset,
    });
  }
}
