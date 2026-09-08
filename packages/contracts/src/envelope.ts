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
  /** 1-based delivery attempt, incremented when a service re-publishes for retry. */
  attempt: number;
  payload: EventPayloadMap[TType];
}

export type AnyEventEnvelope = {
  [TType in EventType]: EventEnvelope<TType>;
}[EventType];
