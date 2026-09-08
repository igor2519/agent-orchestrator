import { EventType } from '@app/contracts';
import { OutboxService } from '@app/messaging';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import {
  BaseNotificationProvider,
  NotificationChannel,
  deliveryFailure,
} from './base-notification-provider';

import type { NotificationDeliveryResult } from './base-notification-provider';
import type { NotificationDelivery } from '../entities/notification-delivery.entity';

/**
 * The delivery payload is stored as free-form JSON, so fields are narrowed rather
 * than coerced: `String(someObject)` would silently write "[object Object]".
 */
const asString = (value: unknown): string => (typeof value === 'string' ? value : '');

/**
 * Delivers a notification to browsers over WebSocket.
 *
 * This service serves no HTTP and therefore holds no sockets. It "delivers" by
 * publishing a broadcast event, which the API - the only service with a listener -
 * relays to connected clients. The event goes through the outbox, so a broadcast
 * cannot be lost if this service dies between deciding and publishing.
 *
 * The result reports success once the broadcast is durably recorded, not once a
 * browser has seen it: no client may be connected at all, and a UI that missed an
 * update re-reads the document.
 */
@Injectable()
export class WebsocketProvider extends BaseNotificationProvider {
  readonly channel = NotificationChannel.Websocket;

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly outbox: OutboxService,
  ) {
    super();
  }

  /** Every outcome is worth showing in a UI, so this channel always applies. */
  supports(): boolean {
    return true;
  }

  async deliver(delivery: NotificationDelivery): Promise<NotificationDeliveryResult> {
    const startedAt = Date.now();
    const payload = delivery.payload;

    try {
      await this.dataSource.transaction(async (manager) => {
        await this.outbox.enqueue(manager, {
          type: EventType.NotificationBroadcast,
          documentId: delivery.documentId,
          correlationId: delivery.correlationId,
          attempt: delivery.documentAttempt,
          payload: {
            deliveryId: delivery.id,
            customerId: asString(payload.customerId),
            documentReference: asString(payload.documentReference),
            event: delivery.eventType,
            status: typeof payload.status === 'string' ? payload.status : null,
            occurredAt: new Date().toISOString(),
          },
        });
      });

      return {
        succeeded: true,
        statusCode: null,
        latencyMs: Date.now() - startedAt,
        error: null,
        responseSnippet: null,
        permanent: false,
      };
    } catch (error) {
      // A database failure here is worth retrying.
      return deliveryFailure(
        error instanceof Error ? error.message : String(error),
        false,
        Date.now() - startedAt,
      );
    }
  }
}
