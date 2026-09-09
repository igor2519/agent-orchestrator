import { TransactionalRepository } from '@app/messaging';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { AuditEvent } from '../entities/audit-event.entity';

import type { EntityManager } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

/** Everything about an entry except the columns the database fills in. */
export type AuditEntryData = Omit<AuditEvent, 'id' | 'sequence' | 'recordedAt'>;

/**
 * Insert-and-read only.
 *
 * There is deliberately no update or delete method here. The database rejects
 * those anyway, but not offering them keeps callers from reaching for one.
 */
@Injectable()
export class AuditEventsRepository extends TransactionalRepository<AuditEvent> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(AuditEvent, dataSource);
  }

  /**
   * Appends one entry using the caller's transaction, so the entry and the
   * change it records commit or roll back together.
   */
  async append(manager: EntityManager, entry: AuditEntryData): Promise<void> {
    // TypeORM's partial-entity type maps a jsonb `Record<string, unknown>` onto its
    // own deep-partial shape, which a plain object does not satisfy. The value is
    // exactly the column's type, so the assertion is narrowing noise, not a risk.
    await this.scoped(manager).insert(entry as QueryDeepPartialEntity<AuditEvent>);
  }

  /** The document's history, oldest first. */
  findForDocument(documentId: string): Promise<AuditEvent[]> {
    return this.scoped().find({ where: { documentId }, order: { sequence: 'ASC' } });
  }
}
