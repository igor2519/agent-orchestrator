import type { AnyEventEnvelope, EventType, Queue } from '@app/contracts';
import type { BaseLogger } from '@app/logger';
import type { EntityManager } from 'typeorm';

export const MESSAGING_OPTIONS = Symbol('MESSAGING_OPTIONS');
export const EVENT_CONTROLLERS = Symbol('EVENT_CONTROLLERS');

export interface MessagingOptions {
  url: string;
  /** Queue this service consumes. Omit for publish-only services. */
  queue?: Queue;
  prefetch: number;
  /** How often the outbox relay looks for unpublished rows. */
  relayIntervalMs: number;
  /** Rows published per relay tick. */
  relayBatchSize: number;
  /** Give up publishing an outbox row after this many failures. */
  relayMaxAttempts: number;
}

export interface EventContext<TType extends EventType = EventType> {
  /** The caller's transaction. Handlers must do all writes through it. */
  manager: EntityManager;
  /** Discriminated on `type`, so a switch narrows `payload` to the right shape. */
  envelope: Extract<AnyEventEnvelope, { type: TType }>;
  /** Logger already bound to this event's correlation and causation ids. */
  logger: BaseLogger;
  /**
   * Registers a callback to run once the surrounding transaction has committed.
   *
   * Anything that escapes the database - pushing to a live stream, invalidating a
   * cache - belongs here rather than inline, so a rolled-back transaction cannot
   * announce work that never happened.
   */
  onCommit: (callback: () => void) => void;
}

/** Signature every `@OnEvent` controller method must satisfy. */
export type EventControllerMethod = (context: EventContext) => Promise<void>;
