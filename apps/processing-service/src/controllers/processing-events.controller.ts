import { EventType, RoutingKey } from '@app/contracts';
import {
  MessageController,
  OnEvent,
  OutboxService,
  classifyError,
  nextAttemptAt,
} from '@app/messaging';
import { Inject, Injectable } from '@nestjs/common';

import envConfig from '../config/env.config';
import { ProcessingResult } from '../entities/processing-result.entity';
import { DocumentProcessorRegistry } from '../processing/document-processor.registry';

import type { DocumentValidatedPayload } from '@app/contracts';
import type { EventContext } from '@app/messaging';
import type { ConfigType } from '@nestjs/config';

/**
 * Step 2 of the pipeline: validated -> processed.
 *
 * Reacts to `DocumentValidated` by running the registered processor, publishing
 * `DocumentProcessingStarted` alongside the outcome so the API can show the
 * PROCESSING state. Both events are ordered by the outbox sequence, so the
 * projection can never apply the result before the start.
 */
@MessageController()
@Injectable()
export class ProcessingEventsController {
  constructor(
    private readonly processors: DocumentProcessorRegistry,
    private readonly outbox: OutboxService,
    @Inject(envConfig.KEY) private readonly config: ConfigType<typeof envConfig>,
  ) {}

  @OnEvent(EventType.DocumentValidated)
  async onDocumentValidated({ manager, envelope, logger }: EventContext): Promise<void> {
    if (envelope.type !== EventType.DocumentValidated) {
      return;
    }

    const payload: DocumentValidatedPayload = envelope.payload;
    const { documentId, correlationId, attempt } = envelope;

    const existing = await manager.findOne(ProcessingResult, { where: { documentId, attempt } });

    if (existing) {
      logger.debug('Processing already recorded for this attempt, skipping');

      return;
    }

    const processor = this.processors.resolve(payload.documentType);

    await this.outbox.enqueue(manager, {
      type: EventType.DocumentProcessingStarted,
      documentId,
      correlationId,
      causationId: envelope.id,
      attempt,
      payload: { processor: processor.name },
    });

    try {
      const { result } = await processor.process({
        documentId,
        documentReference: payload.documentReference,
        documentType: payload.documentType,
        payload: payload.payload,
        payloadUri: payload.payloadUri,
        ocr: payload.ocr,
        attempt,
      });

      await manager.save(
        ProcessingResult,
        manager.create(ProcessingResult, {
          documentId,
          correlationId,
          documentReference: payload.documentReference,
          documentType: payload.documentType,
          attempt,
          outcome: 'PROCESSED',
          processor: processor.name,
          result,
        }),
      );

      await this.outbox.enqueue(manager, {
        type: EventType.DocumentProcessed,
        documentId,
        correlationId,
        causationId: envelope.id,
        attempt,
        payload: { ...payload, processor: processor.name, result },
      });

      logger.log('Document processed', { processor: processor.name });
    } catch (error) {
      await this.publishFailure({ manager, envelope, logger }, processor.name, error);
    }
  }

  private async publishFailure(
    { manager, envelope, logger }: EventContext,
    processorName: string,
    error: unknown,
  ): Promise<void> {
    const classified = classifyError(error);
    const payload = envelope.payload as DocumentValidatedPayload;
    const { documentId, correlationId, attempt } = envelope;
    const canRetry = !classified.permanent && attempt < this.config.maxProcessingAttempts;

    if (canRetry) {
      logger.warn('Processing failed transiently, scheduling retry', {
        code: classified.code,
        attempt,
      });

      await this.outbox.enqueue(manager, {
        type: EventType.DocumentValidated,
        documentId,
        correlationId,
        causationId: envelope.id,
        attempt: attempt + 1,
        // Private key so the retry reaches only this service.
        routingKey: RoutingKey.ProcessingRetry,
        availableAt: nextAttemptAt(attempt),
        payload,
      });

      return;
    }

    await manager.save(
      ProcessingResult,
      manager.create(ProcessingResult, {
        documentId,
        correlationId,
        documentReference: payload.documentReference,
        documentType: payload.documentType,
        attempt,
        outcome: 'FAILED',
        processor: processorName,
        errorCode: classified.code,
        errorMessage: classified.message,
        permanent: classified.permanent,
      }),
    );

    logger.error('Processing failed permanently', classified, {
      code: classified.code,
      attempt,
      permanent: classified.permanent,
    });

    await this.outbox.enqueue(manager, {
      type: EventType.DocumentProcessingFailed,
      documentId,
      correlationId,
      causationId: envelope.id,
      attempt,
      payload: {
        ...payload,
        processor: processorName,
        errorCode: classified.code,
        message: classified.message,
        permanent: classified.permanent,
        attempts: attempt,
      },
    });
  }
}
