import { Injectable } from '@nestjs/common';

import { InboxRepository } from './inbox.repository';

import type { InboxMessage } from './inbox-message.entity';
import type { EntityManager } from 'typeorm';

/**
 * Deduplication store for incoming events.
 *
 * Both write paths take an explicit {@link EntityManager} because they must run
 * inside the caller's transaction - recording "processed" outside it would let the
 * two facts diverge on a rollback.
 */
@Injectable()
export class InboxService {
  constructor(private readonly repository: InboxRepository) {}

  async hasProcessed(manager: EntityManager, eventId: string, consumer: string): Promise<boolean> {
    return this.repository.exists(manager, eventId, consumer);
  }

  async markProcessed(
    manager: EntityManager,
    eventId: string,
    consumer: string,
    type: string,
  ): Promise<void> {
    await this.repository.record(manager, eventId, consumer, type);
  }

  async findByEventId(eventId: string): Promise<InboxMessage[]> {
    return this.repository.findByEventId(eventId);
  }
}
