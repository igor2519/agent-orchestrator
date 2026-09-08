import { Injectable } from '@nestjs/common';

import { InboxMessage } from './inbox-message.entity';

import type { EntityManager } from 'typeorm';

/**
 * Deduplication store for incoming events.
 *
 * Both methods take an explicit {@link EntityManager} because they must run inside
 * the caller's transaction - recording "processed" outside it would let the two
 * facts diverge on a rollback.
 */
@Injectable()
export class InboxService {
  async hasProcessed(manager: EntityManager, eventId: string, consumer: string): Promise<boolean> {
    const existing = await manager.findOne(InboxMessage, {
      where: { eventId, consumer },
      select: { eventId: true },
    });

    return existing !== null;
  }

  /**
   * Marks the event consumed. Uses `ON CONFLICT DO NOTHING` so two concurrent
   * deliveries of the same message cannot both insert; the loser simply finds the
   * row already there.
   */
  async markProcessed(
    manager: EntityManager,
    eventId: string,
    consumer: string,
    type: string,
  ): Promise<void> {
    await manager
      .createQueryBuilder()
      .insert()
      .into(InboxMessage)
      .values({ eventId, consumer, type })
      .orIgnore()
      .execute();
  }
}
