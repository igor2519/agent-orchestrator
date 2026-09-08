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
import { OcrResult } from '../entities/ocr-result.entity';
import { OcrProcessorRegistry } from '../ocr/ocr-processor.registry';
import { DocumentValidatorRegistry } from '../validation/document-validator.registry';

import type { DocumentSubmittedPayload } from '@app/contracts';
import type { EventContext } from '@app/messaging';
import type { ConfigType } from '@nestjs/config';
import type { EntityManager } from 'typeorm';

/**
 * Step 1 of the pipeline: submitted -> validated.
 *
 * Reacts to `DocumentSubmitted` by running OCR and content validation, then
 * publishing `DocumentValidated` or `DocumentValidationFailed`.
 *
 * Nothing here knows which service consumes what it publishes. The controller's
 * only outputs are a row in this service's database and an outbox entry, both
 * written in the transaction the dispatcher opened.
 */
@MessageController()
@Injectable()
export class OcrEventsController {
  constructor(
    private readonly processors: OcrProcessorRegistry,
    private readonly validators: DocumentValidatorRegistry,
    private readonly outbox: OutboxService,
    @Inject(envConfig.KEY) private readonly config: ConfigType<typeof envConfig>,
  ) {}

  @OnEvent(EventType.DocumentSubmitted)
  async onDocumentSubmitted({ manager, envelope, logger }: EventContext): Promise<void> {
    if (envelope.type !== EventType.DocumentSubmitted) {
      return;
    }

    const payload = envelope.payload;
    const { documentId, correlationId, attempt } = envelope;

    // Business-level idempotency, independent of the inbox: a replay that somehow
    // reaches here must not produce a second result row.
    const existing = await manager.findOne(OcrResult, { where: { documentId, attempt } });

    if (existing) {
      logger.debug('OCR already completed for this attempt, skipping');

      return;
    }

    let ocr;

    try {
      const processor = this.processors.resolve(payload.documentType);
      ocr = await processor.extract({
        documentId,
        documentReference: payload.documentReference,
        documentType: payload.documentType,
        payload: payload.payload,
        payloadUri: payload.payloadUri,
      });
    } catch (error) {
      await this.publishOcrFailure({ manager, envelope, logger }, error);

      return;
    }

    const { issues, executed } = await this.validators.validate({
      documentId,
      documentReference: payload.documentReference,
      documentType: payload.documentType,
      payload: payload.payload,
      ocr,
    });

    await manager.save(
      OcrResult,
      manager.create(OcrResult, {
        documentId,
        correlationId,
        documentReference: payload.documentReference,
        documentType: payload.documentType,
        attempt,
        outcome: issues.length > 0 ? 'VALIDATION_FAILED' : 'VALIDATED',
        ocr,
        issues,
        validatorsExecuted: executed,
      }),
    );

    if (issues.length > 0) {
      logger.warn('Document failed content validation', { issues: issues.length });

      await this.outbox.enqueue(manager, {
        type: EventType.DocumentValidationFailed,
        documentId,
        correlationId,
        causationId: envelope.id,
        attempt,
        payload: { ...payload, issues },
      });

      return;
    }

    await this.outbox.enqueue(manager, {
      type: EventType.DocumentValidated,
      documentId,
      correlationId,
      causationId: envelope.id,
      attempt,
      payload: { ...payload, ocr, validators: executed },
    });

    logger.log('Document validated', { engine: ocr.engine, validators: executed.length });
  }

  /**
   * Transient failures are rescheduled by writing a delayed outbox row addressed
   * to this service's own retry key. Permanent failures, and transient ones that
   * have used up their attempts, end the flow with a validation failure.
   */
  private async publishOcrFailure(
    { manager, envelope, logger }: EventContext,
    error: unknown,
  ): Promise<void> {
    const classified = classifyError(error);
    const payload = envelope.payload as DocumentSubmittedPayload;
    const { documentId, correlationId, attempt } = envelope;
    const canRetry = !classified.permanent && attempt < this.config.maxProcessingAttempts;

    if (canRetry) {
      logger.warn('OCR failed transiently, scheduling retry', {
        code: classified.code,
        attempt,
      });

      await this.enqueueRetry(manager, envelope, payload);

      return;
    }

    logger.error('OCR failed permanently', classified, { code: classified.code, attempt });

    await this.outbox.enqueue(manager, {
      type: EventType.DocumentValidationFailed,
      documentId,
      correlationId,
      causationId: envelope.id,
      attempt,
      payload: {
        ...payload,
        issues: [
          {
            validator: 'ocr',
            code: classified.code,
            message: classified.message,
          },
        ],
      },
    });
  }

  private async enqueueRetry(
    manager: EntityManager,
    envelope: EventContext['envelope'],
    payload: DocumentSubmittedPayload,
  ): Promise<void> {
    await this.outbox.enqueue(manager, {
      type: EventType.DocumentSubmitted,
      documentId: envelope.documentId,
      correlationId: envelope.correlationId,
      causationId: envelope.id,
      attempt: envelope.attempt + 1,
      // Private retry key: only this service's queue is bound to it, so a retry
      // never re-notifies the API or any other consumer.
      routingKey: RoutingKey.OcrRetry,
      availableAt: nextAttemptAt(envelope.attempt),
      payload,
    });
  }
}
