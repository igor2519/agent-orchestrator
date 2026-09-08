import { EventPayloadMap, EventType } from './events';

/**
 * Transport-agnostic wrapper around every published event.
 *
 * `id` is the deduplication key consumers persist in their inbox, so a redelivered
 * message is recognised and skipped. `correlationId` is constant for the whole
 * document flow; `causationId` points at the event that directly triggered this one,
 * which makes the choreography reconstructable as a causal chain.
 */
export interface EventEnvelope<TType extends EventType = EventType> {
  id: string;
  type: TType;
  occurredAt: string;
  correlationId: string;
  causationId: string | null;
  documentId: string;
  /**
   * The HTTP request that originally set this work in motion.
   *
   * Distinct from `correlationId`: correlation groups everything about one
   * document (including operator retries months later), while the request id
   * pins work to the single inbound call that caused it, which is what an
   * operator has when a customer quotes a failed request.
   */
  requestId: string | null;
  /** 1-based delivery attempt, incremented when a service re-publishes for retry. */
  attempt: number;
  payload: EventPayloadMap[TType];
}

export type AnyEventEnvelope = {
  [TType in EventType]: EventEnvelope<TType>;
}[EventType];
