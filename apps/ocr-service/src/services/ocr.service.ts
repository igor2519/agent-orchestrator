import { EventType, RoutingKey } from '@app/contracts';
import { OutboxService, classifyError, nextAttemptAt } from '@app/messaging';
import { Inject, Injectable } from '@nestjs/common';

import envConfig from '../config/env.config';
import { OcrProcessorRegistry } from '../ocr/ocr-processor.registry';
import { OcrResultsRepository } from '../repositories/ocr-results.repository';
import { DocumentValidatorRegistry } from '../validation/document-validator.registry';

import type { DocumentSubmittedPayload, OcrOutcome } from '@app/contracts';
import type { EventContext } from '@app/messaging';
import type { ConfigType } from '@nestjs/config';

/**
 * Step 1 of the pipeline: submitted -> validated.
 *
 * Runs the registered OCR engine, then every validator that claims the document
 * type, and publishes `DocumentValidated` or `DocumentValidationFailed`.
 *
 * Nothing here knows which service consumes what it publishes. The only outputs
 * are a row in this service's database and an outbox entry, both written in the
 * transaction the dispatcher opened.
 */
@Injectable()
export class OcrService {
  constructor(
    private readonly processors: OcrProcessorRegistry,
    private readonly validators: DocumentValidatorRegistry,
    private readonly results: OcrResultsRepository,
    private readonly outbox: OutboxService,
    @Inject(envConfig.KEY) private readonly config: ConfigType<typeof envConfig>,
  ) {}

  async handleDocumentSubmitted(context: EventContext): Promise<void> {
    const { manager, envelope, logger } = context;

    if (envelope.type !== EventType.DocumentSubmitted) {
      return;
    }

    const payload = envelope.payload;
    const { documentId, correlationId, attempt } = envelope;

    // Independent of the inbox: a replay that somehow reaches here must not
    // produce a second result row.
    if (await this.results.findByAttempt(manager, documentId, attempt)) {
      logger.debug('OCR already completed for this attempt, skipping');

      return;
    }

    let ocr: OcrOutcome;

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
      await this.publishOcrFailure(context, error);

      return;
    }

    const { issues, executed } = await this.validators.validate({
      documentId,
      documentReference: payload.documentReference,
      documentType: payload.documentType,
      payload: payload.payload,
      ocr,
    });

    await this.results.save(manager, {
      documentId,
      correlationId,
      documentReference: payload.documentReference,
      documentType: payload.documentType,
      attempt,
      outcome: issues.length > 0 ? 'VALIDATION_FAILED' : 'VALIDATED',
      ocr,
      issues,
      validatorsExecuted: executed,
    });

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
   * Transient failures are rescheduled by writing a delayed outbox row addressed to
   * this service's own retry key. Permanent failures, and transient ones that have
   * used up their attempts, end the flow with a validation failure.
   */
  private async publishOcrFailure(
    { manager, envelope, logger }: EventContext,
    error: unknown,
  ): Promise<void> {
    const classified = classifyError(error);
    const payload = envelope.payload as DocumentSubmittedPayload;
    const { documentId, correlationId, attempt } = envelope;

    if (!classified.permanent && attempt < this.config.maxProcessingAttempts) {
      logger.warn('OCR failed transiently, scheduling retry', {
        code: classified.code,
        attempt,
      });

      await this.outbox.enqueue(manager, {
        type: EventType.DocumentSubmitted,
        documentId,
        correlationId,
        causationId: envelope.id,
        attempt: attempt + 1,
        // Private retry key: only this service's queue is bound to it, so a retry
        // never re-notifies the API or any other consumer.
        routingKey: RoutingKey.OcrRetry,
        availableAt: nextAttemptAt(attempt),
        payload,
      });

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
        issues: [{ validator: 'ocr', code: classified.code, message: classified.message }],
      },
    });
  }
}
