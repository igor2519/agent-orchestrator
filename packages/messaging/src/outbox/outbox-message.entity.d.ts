import type { AnyEventEnvelope } from '@app/contracts';
export declare class OutboxMessage {
    id: string;
    documentId: string;
    type: string;
    routingKey: string;
    envelope: AnyEventEnvelope;
    correlationId: string;
    causationId: string | null;
    requestId: string | null;
    sequence: string;
    availableAt: Date;
    publishedAt: Date | null;
    attempts: number;
    lastError: string | null;
    createdAt: Date;
}
//# sourceMappingURL=outbox-message.entity.d.ts.map