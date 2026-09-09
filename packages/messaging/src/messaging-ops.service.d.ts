import { InboxService } from './inbox/inbox.service';
import { OutboxRepository } from './outbox/outbox.repository';
import type { InboxMessage } from './inbox/inbox-message.entity';
import type { OutboxMessage } from './outbox/outbox-message.entity';
export declare class MessagingOpsService {
    private readonly outbox;
    private readonly inbox;
    constructor(outbox: OutboxRepository, inbox: InboxService);
    outboxStats(): Promise<{
        pending: number;
        published: number;
        failing: number;
    }>;
    pendingOutbox(limit?: number): Promise<OutboxMessage[]>;
    inboxEntry(eventId: string): Promise<{
        eventId: string;
        processed: boolean;
        entries: InboxMessage[];
    }>;
}
//# sourceMappingURL=messaging-ops.service.d.ts.map