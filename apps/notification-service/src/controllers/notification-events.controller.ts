import { EventType } from '@app/contracts';
import { MessageController, OnEvent } from '@app/messaging';
import { Injectable } from '@nestjs/common';

import { NotificationIntakeService } from '../services/notification-intake.service';

import type { EventContext } from '@app/messaging';

/**
 * RabbitMQ endpoints of the notification service.
 *
 * Declares the subscriptions and delegates; all decisions live in
 * {@link NotificationIntakeService}.
 */
@MessageController()
@Injectable()
export class NotificationEventsController {
  constructor(private readonly intake: NotificationIntakeService) {}

  @OnEvent(
    EventType.DocumentProcessed,
    EventType.DocumentProcessingFailed,
    EventType.DocumentValidationFailed,
    EventType.DocumentDuplicateDetected,
  )
  async onDocumentOutcome(context: EventContext): Promise<void> {
    await this.intake.queueDelivery(context);
  }
}
