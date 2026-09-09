import { Injectable } from '@nestjs/common';

import { ReceivedCallbacksRepository } from '../repositories/received-callbacks.repository';

import { WebhookSignatureService } from './webhook-signature.service';

import type { ReceivedCallback } from '../entities/received-callback.entity';

const RECENT_LIMIT = 50;

export interface ReceiveResult {
  received: true;
  signatureValid: boolean;
}

/** What a customer system would do on receipt: verify, then record. */
@Injectable()
export class MockReceiverService {
  constructor(
    private readonly callbacks: ReceivedCallbacksRepository,
    private readonly signatures: WebhookSignatureService,
  ) {}

  async receive(
    body: Record<string, unknown>,
    signature: string | undefined,
    timestamp: string | undefined,
  ): Promise<ReceiveResult> {
    const raw = JSON.stringify(body);
    const provided = signature?.replace(/^sha256=/, '') ?? '';
    const signatureValid =
      timestamp !== undefined && this.signatures.verify(raw, timestamp, provided);

    await this.callbacks.save({
      documentId: (body.documentId as string | undefined) ?? null,
      correlationId: (body.correlationId as string | undefined) ?? null,
      eventType: (body.event as string | undefined) ?? null,
      signatureValid,
      body,
    });

    return { received: true, signatureValid };
  }

  list(documentId?: string): Promise<ReceivedCallback[]> {
    return this.callbacks.findRecent(documentId, RECENT_LIMIT);
  }
}
