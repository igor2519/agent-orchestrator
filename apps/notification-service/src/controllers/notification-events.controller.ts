import { EventType } from '@app/contracts';
import { MessageController, OnEvent } from '@app/messaging';
import { Injectable } from '@nestjs/common';

import { NotificationService } from '../services/notification.service';

import type { EventContext } from '@app/messaging';

/**
 * RabbitMQ endpoints of the notification service.
 *
 * Declares the subscriptions and delegates; all decisions live in
 * {@link NotificationService}.
 */
@MessageController()
@Injectable()
export class NotificationEventsController {
  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent(
    EventType.DocumentProcessed,
    EventType.DocumentProcessingFailed,
    EventType.DocumentValidationFailed,
  )
  async onDocumentOutcome(context: EventContext): Promise<void> {
    await this.notificationService.queueDelivery(context);
  }
}
