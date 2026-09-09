import type { AnyEventEnvelope, EventType, Queue } from '@app/contracts';
import type { BaseLogger } from '@app/logger';
import type { EntityManager } from 'typeorm';
export declare const MESSAGING_OPTIONS: unique symbol;
export declare const EVENT_CONTROLLERS: unique symbol;
export interface MessagingOptions {
    url: string;
    queue?: Queue;
    prefetch: number;
    relayIntervalMs: number;
    relayBatchSize: number;
    relayMaxAttempts: number;
}
export interface EventContext<TType extends EventType = EventType> {
    manager: EntityManager;
    envelope: Extract<AnyEventEnvelope, {
        type: TType;
    }>;
    logger: BaseLogger;
    onCommit: (callback: () => void) => void;
}
export type EventControllerMethod = (context: EventContext) => Promise<void>;
//# sourceMappingURL=messaging.tokens.d.ts.map