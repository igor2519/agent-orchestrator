import { EventType } from '@app/contracts';
import { MessageController, OnEvent } from '@app/messaging';
import { Injectable } from '@nestjs/common';

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
  constructor(private readonly projection: DocumentProjectionService) {}

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
}
