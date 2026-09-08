import { EventType } from '@app/contracts';
import { Injectable } from '@nestjs/common';

import { NotificationProviderRegistry } from '../providers/notification-provider.registry';
import { NotificationDeliveriesRepository } from '../repositories/notification-deliveries.repository';

import type { EventContext } from '@app/messaging';

/**
 * Step 3 of the pipeline: terminal outcome -> one delivery owed per channel.
 *
 * Intake deliberately performs no I/O: it runs inside the consumer's database
 * transaction, and holding one open across a request to a third party would tie
 * database health to customer endpoint latency. It records what is owed; the
 * worker and the providers do the sending.
 */
@Injectable()
export class NotificationIntakeService {
  constructor(
    private readonly deliveries: NotificationDeliveriesRepository,
    private readonly providers: NotificationProviderRegistry,
  ) {}

  async queueDelivery({ manager, envelope, logger }: EventContext): Promise<void> {
    if (
      envelope.type !== EventType.DocumentProcessed &&
      envelope.type !== EventType.DocumentProcessingFailed &&
      envelope.type !== EventType.DocumentValidationFailed
    ) {
      return;
    }

    const { documentId, correlationId, attempt, payload } = envelope;
    const body = {
      documentId,
      correlationId,
      event: envelope.type,
      occurredAt: envelope.occurredAt,
      customerId: payload.customerId,
      documentReference: payload.documentReference,
      documentType: payload.documentType,
      data: payload,
    };

    // Providers decide from the candidate itself - the webhook channel opts out
    // when no callback was given.
    const candidate = { callbackUrl: payload.callbackUrl, eventType: envelope.type };

    for (const provider of this.providers.applicableTo(candidate)) {
      const existing = await this.deliveries.findByDocumentAttemptChannel(
        manager,
        documentId,
        attempt,
        provider.channel,
      );

      if (existing) {
        logger.debug('Delivery already queued for this channel, skipping', {
          channel: provider.channel,
        });
        continue;
      }

      await this.deliveries.save(manager, {
        documentId,
        correlationId,
        documentAttempt: attempt,
        channel: provider.channel,
        callbackUrl: payload.callbackUrl ?? null,
        eventType: envelope.type,
        payload: body,
      });

      logger.log('Delivery queued', { channel: provider.channel });
    }
  }
}
