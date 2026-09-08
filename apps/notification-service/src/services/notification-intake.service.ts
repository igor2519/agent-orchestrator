import { EventType } from '@app/contracts';
import { Inject, Injectable } from '@nestjs/common';

import envConfig from '../config/env.config';
import { NotificationProviderRegistry } from '../providers/notification-provider.registry';
import { NotificationDeliveriesRepository } from '../repositories/notification-deliveries.repository';

import type { NotificationCandidate } from '../providers/base-notification-provider';
import type { AnyEventEnvelope } from '@app/contracts';
import type { EventContext } from '@app/messaging';
import type { ConfigType } from '@nestjs/config';

/** Events a customer is told about. */
const NOTIFIABLE = [
  EventType.DocumentProcessed,
  EventType.DocumentProcessingFailed,
  EventType.DocumentValidationFailed,
  EventType.DocumentDuplicateDetected,
] as const;

type NotifiableEvent = (typeof NOTIFIABLE)[number];

/**
 * Narrows the envelope union to the events this service acts on.
 *
 * A predicate rather than a bare `includes`, so the compiler knows the payload has
 * the customer fields all four notifiable events share.
 */
const isNotifiable = (
  envelope: EventContext['envelope'],
): envelope is Extract<AnyEventEnvelope, { type: NotifiableEvent }> =>
  (NOTIFIABLE as readonly string[]).includes(envelope.type);

/**
 * Turns a notifiable outcome into one delivery owed per applicable channel.
 *
 * Intake deliberately performs no I/O: it runs inside the consumer's database
 * transaction, and holding one open across a request to a third party would tie
 * database health to customer endpoint latency. It records what is owed; the
 * scheduler and providers do the sending.
 */
@Injectable()
export class NotificationIntakeService {
  constructor(
    private readonly deliveries: NotificationDeliveriesRepository,
    private readonly providers: NotificationProviderRegistry,
    @Inject(envConfig.KEY) private readonly config: ConfigType<typeof envConfig>,
  ) {}

  async queueDelivery({ manager, envelope, logger }: EventContext): Promise<void> {
    if (!isNotifiable(envelope)) {
      return;
    }

    const { documentId, correlationId, attempt, payload } = envelope;
    const isDuplicate = envelope.type === EventType.DocumentDuplicateDetected;
    const succeeded = envelope.type === EventType.DocumentProcessed;

    const body = {
      documentId,
      correlationId,
      event: envelope.type,
      occurredAt: envelope.occurredAt,
      customerId: payload.customerId,
      documentReference: payload.documentReference,
      documentType: payload.documentType,
      status: NotificationIntakeService.statusFor(envelope.type),
      // The processed file is offered as a link rather than inlined, so a customer
      // fetches it when they want it and the payload stays a fixed size.
      resultUrl:
        succeeded || isDuplicate
          ? `${this.config.publicApiUrl}/documents/${documentId}/result`
          : null,
      duplicate: isDuplicate,
      data: payload,
    };

    const candidate: NotificationCandidate = {
      callbackUrl: payload.callbackUrl,
      eventType: envelope.type,
      notificationMode: payload.notificationMode,
    };

    for (const provider of this.providers.applicableTo(candidate)) {
      const existing = await this.deliveries.findExisting(
        manager,
        documentId,
        attempt,
        provider.channel,
        envelope.type,
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
        callbackUrl: payload.callbackUrl || null,
        eventType: envelope.type,
        payload: body,
      });

      logger.log('Delivery queued', { channel: provider.channel, duplicate: isDuplicate });
    }
  }

  private static statusFor(type: NotifiableEvent): string {
    switch (type) {
      case EventType.DocumentProcessed:
        return 'COMPLETED';
      case EventType.DocumentDuplicateDetected:
        return 'ALREADY_PROCESSED';
      default:
        return 'FAILED';
    }
  }
}
