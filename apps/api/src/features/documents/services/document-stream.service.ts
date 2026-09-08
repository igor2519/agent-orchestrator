import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';

import type { DocumentStatus } from '@app/contracts';
import type { Observable } from 'rxjs';

export interface DocumentStatusEvent {
  documentId: string;
  correlationId: string;
  status: DocumentStatus | null;
  eventType: string;
  notificationStatus?: string;
  occurredAt: string;
}

/**
 * In-process fan-out of projection updates to connected SSE clients.
 *
 * A browser cannot receive a webhook, so this is the equivalent for a UI: the
 * notification service still delivers the real signed webhook to the customer's
 * endpoint, and the API republishes the same milestones to anyone watching.
 *
 * Deliberately in-memory and best-effort. A client that misses an update while
 * disconnected re-reads the document, which remains the source of truth; making
 * this durable would mean a second delivery guarantee for something the database
 * already answers.
 */
@Injectable()
export class DocumentStreamService {
  private readonly events = new Subject<DocumentStatusEvent>();

  publish(event: DocumentStatusEvent): void {
    this.events.next(event);
  }

  asObservable(): Observable<DocumentStatusEvent> {
    return this.events.asObservable();
  }
}
