import { DocumentStatus, EventType, FailureReason } from '@app/contracts';
import { MessageController, OnEvent } from '@app/messaging';
import { Injectable } from '@nestjs/common';

import { Document } from '../entities/document.entity';

import type { EventContext } from '@app/messaging';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

/**
 * The API's read-model projection.
 *
 * Keeps the API's queryable view in step with what the other services report.
 *
 * This is deliberately the only place the API reacts to downstream events, and it
 * only ever writes its own row - it never publishes an instruction. The workflow
 * advances because OCR, Processing and Notification each react to the previous
 * service's event, not because anything here co-ordinates them.
 */
@MessageController()
@Injectable()
export class DocumentEventsController {
  @OnEvent(
    EventType.DocumentValidated,
    EventType.DocumentValidationFailed,
    EventType.DocumentProcessingStarted,
    EventType.DocumentProcessed,
    EventType.DocumentProcessingFailed,
    EventType.NotificationDelivered,
    EventType.NotificationFailed,
  )
  async onDocumentEvent({ manager, envelope, logger }: EventContext): Promise<void> {
    const update = DocumentEventsController.toUpdate(envelope);

    if (!update) {
      return;
    }

    const result = await manager.update(Document, { id: envelope.documentId }, update);

    if (result.affected === 0) {
      logger.warn('Projection target document not found', { documentId: envelope.documentId });
    }
  }

  private static toUpdate(
    envelope: EventContext['envelope'],
  ): QueryDeepPartialEntity<Document> | null {
    const now = new Date();

    switch (envelope.type) {
      case EventType.DocumentValidated:
        return {
          status: DocumentStatus.Validated,
          validatedAt: now,
          ocrResult: { ...envelope.payload.ocr, validators: envelope.payload.validators },
        };

      case EventType.DocumentValidationFailed:
        return {
          status: DocumentStatus.Failed,
          failureReason: FailureReason.Validation,
          failedAt: now,
          errorCode: 'VALIDATION_FAILED',
          errorMessage: envelope.payload.issues.map((issue) => issue.message).join('; '),
        };

      case EventType.DocumentProcessingStarted:
        return { status: DocumentStatus.Processing, processingStartedAt: now };

      case EventType.DocumentProcessed:
        return {
          status: DocumentStatus.Completed,
          completedAt: now,
          processingResult: { processor: envelope.payload.processor, ...envelope.payload.result },
        };

      case EventType.DocumentProcessingFailed:
        return {
          status: DocumentStatus.Failed,
          failureReason: envelope.payload.permanent
            ? FailureReason.Permanent
            : FailureReason.AttemptsExhausted,
          failedAt: now,
          errorCode: envelope.payload.errorCode,
          errorMessage: envelope.payload.message,
          attempts: envelope.payload.attempts,
        };

      // Delivery outcome never changes the document's own status: a completed
      // document whose webhook failed is still completed.
      case EventType.NotificationDelivered:
        return {
          notificationStatus: 'DELIVERED',
          notificationAttempts: envelope.payload.attempts,
          notificationAttemptLog: envelope.payload.attemptLog,
        };

      case EventType.NotificationFailed:
        return {
          notificationStatus: 'UNDELIVERABLE',
          notificationAttempts: envelope.payload.attempts,
          notificationAttemptLog: envelope.payload.attemptLog,
        };

      default:
        return null;
    }
  }
}
