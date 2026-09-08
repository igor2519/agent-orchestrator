import { EventType } from '@app/contracts';
import { MessageController, OnEvent } from '@app/messaging';
import { Injectable } from '@nestjs/common';

import { DocumentsGateway } from '../documents.gateway';
import { DocumentProjectionService } from '../services/document-projection.service';

import type { EventContext } from '@app/messaging';

/**
 * RabbitMQ endpoints of the API service.
 *
 * The API subscribes purely to keep its read model current; it publishes
 * `DocumentSubmitted` and never instructs another service.
 */
@MessageController()
@Injectable()
export class DocumentEventsController {
  constructor(
    private readonly projection: DocumentProjectionService,
    private readonly gateway: DocumentsGateway,
  ) {}

  @OnEvent(
    EventType.DocumentValidated,
    EventType.DocumentValidationFailed,
    EventType.DocumentProcessingStarted,
    EventType.DocumentProcessed,
    EventType.DocumentProcessingFailed,
    EventType.NotificationDelivered,
    EventType.NotificationFailed,
  )
  async onDocumentEvent(context: EventContext): Promise<void> {
    await this.projection.apply(context);
  }

  /**
   * The API end of the notification service's websocket channel: that service
   * publishes the broadcast, this relays it to connected browsers once the
   * consuming transaction has committed.
   */
  @OnEvent(EventType.NotificationBroadcast)
  async onNotificationBroadcast({ envelope, onCommit }: EventContext): Promise<void> {
    if (envelope.type !== EventType.NotificationBroadcast) {
      return;
    }

    const { payload } = envelope;

    onCommit(() => {
      this.gateway.broadcast({
        documentId: envelope.documentId,
        correlationId: envelope.correlationId,
        status: null,
        eventType: payload.event,
        occurredAt: payload.occurredAt,
        channel: 'WEBSOCKET',
      });
    });

    return Promise.resolve();
  }
}
