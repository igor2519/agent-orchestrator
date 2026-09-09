import { Injectable, NotFoundException } from '@nestjs/common';

import { AuditEventsRepository } from '../repositories/audit-events.repository';

import type { AuditAction, AuditActor } from '../constants/audit-action';
import type { AuditEvent } from '../entities/audit-event.entity';
import type { DocumentStatus } from '@app/contracts';
import type { EntityManager } from 'typeorm';

/** Everything a caller must supply to record one entry. */
export interface RecordAuditInput {
  documentId: string;
  customerId: string;
  correlationId: string;
  action: AuditAction;
  actor: AuditActor;
  fromStatus?: DocumentStatus | null;
  toStatus?: DocumentStatus | null;
  eventType?: string | null;
  eventId?: string | null;
  attempt?: number | null;
  detail?: Record<string, unknown> | null;
}

/**
 * The only way anything in the API writes history.
 *
 * Every method takes the caller's `EntityManager` rather than opening its own
 * transaction. That is the whole point: the audit entry has to be atomic with
 * the change it describes, otherwise a crash between the two leaves the trail
 * claiming something that never happened, or silent about something that did.
 */
@Injectable()
export class AuditService {
  constructor(private readonly events: AuditEventsRepository) {}

  /** Appends one entry inside the caller's transaction. */
  async record(manager: EntityManager, input: RecordAuditInput): Promise<void> {
    await this.events.append(manager, {
      documentId: input.documentId,
      customerId: input.customerId,
      correlationId: input.correlationId,
      action: input.action,
      actor: input.actor,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      eventType: input.eventType ?? null,
      eventId: input.eventId ?? null,
      attempt: input.attempt ?? null,
      detail: input.detail ?? null,
    });
  }

  /**
   * The document's history, oldest first.
   *
   * Throws when the document has no entries at all, which for a document that
   * exists is impossible - submission always writes the first line.
   */
  async findForDocument(documentId: string): Promise<AuditEvent[]> {
    const entries = await this.events.findForDocument(documentId);

    if (entries.length === 0) {
      throw new NotFoundException(`No audit trail found for document ${documentId}`);
    }

    return entries;
  }
}
