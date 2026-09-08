import { ROUTING_KEY_BY_EVENT } from '@app/contracts';
import { Injectable } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

import { OutboxRepository } from './outbox.repository';

import type { OutboxMessage } from './outbox-message.entity';
import type { AnyEventEnvelope, EventPayloadMap, EventType, RoutingKey } from '@app/contracts';
import type { EntityManager } from 'typeorm';

export interface EnqueueOptions<TType extends EventType> {
  type: TType;
  documentId: string;
  payload: EventPayloadMap[TType];
  correlationId: string;
  causationId?: string | null;
  /** Overrides the event's default routing key, used for service-private retries. */
  routingKey?: RoutingKey;
  /** Delays publication - this is how retry backoff is scheduled. */
  availableAt?: Date;
  attempt?: number;
}

/**
 * Writes outgoing events into the same transaction as the state change that
 * produced them.
 */
@Injectable()
export class OutboxService {
  constructor(private readonly repository: OutboxRepository) {}

  async enqueue<TType extends EventType>(
    manager: EntityManager,
    options: EnqueueOptions<TType>,
  ): Promise<OutboxMessage> {
    const envelope = {
      id: uuid(),
      type: options.type,
      occurredAt: new Date().toISOString(),
      correlationId: options.correlationId,
      causationId: options.causationId ?? null,
      documentId: options.documentId,
      attempt: options.attempt ?? 1,
      payload: options.payload,
    } as AnyEventEnvelope;

    return this.repository.add(manager, {
      id: envelope.id,
      documentId: options.documentId,
      type: options.type,
      routingKey: options.routingKey ?? ROUTING_KEY_BY_EVENT[options.type],
      envelope,
      correlationId: envelope.correlationId,
      causationId: envelope.causationId,
      availableAt: options.availableAt ?? new Date(),
      publishedAt: null,
      attempts: 0,
      lastError: null,
    });
  }
}
