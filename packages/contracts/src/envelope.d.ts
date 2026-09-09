import { EventPayloadMap, EventType } from './events';
export interface EventEnvelope<TType extends EventType = EventType> {
    id: string;
    type: TType;
    occurredAt: string;
    correlationId: string;
    causationId: string | null;
    documentId: string;
    requestId: string | null;
    attempt: number;
    payload: EventPayloadMap[TType];
}
export type AnyEventEnvelope = {
    [TType in EventType]: EventEnvelope<TType>;
}[EventType];
//# sourceMappingURL=envelope.d.ts.map