import { EventType } from '@app/contracts';
import { MessageController, OnEvent } from '@app/messaging';
import { Injectable } from '@nestjs/common';

import { NotificationDelivery } from '../entities/notification-delivery.entity';

import type { EventContext } from '@app/messaging';

/**
 * Step 3 of the pipeline: outcome -> webhook owed.
 *
 * Turns a terminal document outcome into a delivery owed to the customer.
 *
 * The handler deliberately does not perform the HTTP call: it runs inside the
 * consumer's database transaction, and holding a transaction open across a network
 * request to a third party would tie database health to customer endpoint latency.
 * It only records the intent; {@link DeliveryWorker} does the sending.
 */
@MessageController()
@Injectable()
export class NotificationEventsController {
  @OnEvent(
    EventType.DocumentProcessed,
    EventType.DocumentProcessingFailed,
    EventType.DocumentValidationFailed,
  )
  async onDocumentOutcome({ manager, envelope, logger }: EventContext): Promise<void> {
    if (
      envelope.type !== EventType.DocumentProcessed &&
      envelope.type !== EventType.DocumentProcessingFailed &&
      envelope.type !== EventType.DocumentValidationFailed
    ) {
      return;
    }

    const { documentId, correlationId, attempt, payload } = envelope;

    const existing = await manager.findOne(NotificationDelivery, {
      where: { documentId, documentAttempt: attempt },
    });

    if (existing) {
      logger.debug('Delivery already queued for this outcome, skipping');

      return;
    }

    await manager.save(
      NotificationDelivery,
      manager.create(NotificationDelivery, {
        documentId,
        correlationId,
        documentAttempt: attempt,
        callbackUrl: payload.callbackUrl,
        eventType: envelope.type,
        payload: {
          documentId,
          correlationId,
          event: envelope.type,
          occurredAt: envelope.occurredAt,
          customerId: payload.customerId,
          documentReference: payload.documentReference,
          documentType: payload.documentType,
          data: payload,
        },
      }),
    );

    logger.log('Delivery queued', { callbackUrl: payload.callbackUrl });
  }
}
