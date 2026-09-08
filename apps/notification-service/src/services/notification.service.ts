import { EventType } from '@app/contracts';
import { Injectable } from '@nestjs/common';

import { NotificationDeliveriesRepository } from '../repositories/notification-deliveries.repository';

import type { EventContext } from '@app/messaging';

/**
 * Step 3 of the pipeline: terminal outcome -> webhook owed.
 *
 * Deliberately does not perform the HTTP call: this runs inside the consumer's
 * database transaction, and holding one open across a request to a third party
 * would tie database health to customer endpoint latency. It records the intent;
 * `DeliveryWorker` does the sending.
 */
@Injectable()
export class NotificationService {
  constructor(private readonly deliveries: NotificationDeliveriesRepository) {}

  async queueDelivery({ manager, envelope, logger }: EventContext): Promise<void> {
    if (
      envelope.type !== EventType.DocumentProcessed &&
      envelope.type !== EventType.DocumentProcessingFailed &&
      envelope.type !== EventType.DocumentValidationFailed
    ) {
      return;
    }

    const { documentId, correlationId, attempt, payload } = envelope;

    if (await this.deliveries.findByDocumentAttempt(manager, documentId, attempt)) {
      logger.debug('Delivery already queued for this outcome, skipping');

      return;
    }

    await this.deliveries.save(manager, {
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
    });

    logger.log('Delivery queued', { callbackUrl: payload.callbackUrl });
  }
}
