import { Injectable } from '@nestjs/common';

import { InboxService } from './inbox/inbox.service';
import { OutboxRepository } from './outbox/outbox.repository';

import type { InboxMessage } from './inbox/inbox-message.entity';
import type { OutboxMessage } from './outbox/outbox-message.entity';

const MAX_PAGE = 200;
const DEFAULT_PAGE = 50;

/** Read-only operational queries over this service's own inbox and outbox. */
@Injectable()
export class MessagingOpsService {
  constructor(
    private readonly outbox: OutboxRepository,
    private readonly inbox: InboxService,
  ) {}

  async outboxStats(): Promise<{ pending: number; published: number; failing: number }> {
    const [pending, published, failing] = await Promise.all([
      this.outbox.countPending(),
      this.outbox.countPublished(),
      this.outbox.countFailing(),
    ]);

    return { pending, published, failing };
  }

  async pendingOutbox(limit = DEFAULT_PAGE): Promise<OutboxMessage[]> {
    return this.outbox.findPending(Math.min(limit, MAX_PAGE));
  }

  async inboxEntry(
    eventId: string,
  ): Promise<{ eventId: string; processed: boolean; entries: InboxMessage[] }> {
    const entries = await this.inbox.findByEventId(eventId);

    return { eventId, processed: entries.length > 0, entries };
  }
}
