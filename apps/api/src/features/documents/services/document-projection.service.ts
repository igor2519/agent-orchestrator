import { DocumentStatus, EventType, FailureReason } from '@app/contracts';
import { Injectable } from '@nestjs/common';

import { AuditService } from 'src/features/audit';
import { AuditAction, AuditActor } from 'src/features/audit/constants/audit-action';

import { DocumentsRepository } from '../repositories/documents.repository';

import { DocumentStreamService } from './document-stream.service';

import type { Document } from '../entities/document.entity';
import type { EventContext } from '@app/messaging';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

/**
 * Keeps the API's queryable view in step with what the other services report.
 *
 * This is the only place the API reacts to downstream events, and it only ever
 * writes its own row - it never publishes an instruction. The workflow advances
 * because OCR, Processing and Notification each react to the previous service's
 * event, not because anything here co-ordinates them.
 */
@Injectable()
export class DocumentProjectionService {
  constructor(
    private readonly documents: DocumentsRepository,
    private readonly stream: DocumentStreamService,
    private readonly audit: AuditService,
  ) {}

  async apply({ manager, envelope, logger, onCommit }: EventContext): Promise<void> {
    const update = DocumentProjectionService.toUpdate(envelope);

    if (!update) {
      return;
    }

    // Read before writing so the trail can record what the status actually moved
    // from, rather than asserting a transition that may not have happened.
    const before = await this.documents.findById(envelope.documentId, manager);

    const affected = await this.documents.applyProjection(manager, envelope.documentId, update);

    if (affected === 0) {
      logger.warn('Projection target document not found', { documentId: envelope.documentId });

      return;
    }

    if (before) {
      await this.recordAudit(manager, before, update, envelope);
    }

    // Announced only once the projection has actually committed.
    onCommit(() => {
      this.stream.publish({
        documentId: envelope.documentId,
        correlationId: envelope.correlationId,
        status: (update.status as DocumentStatus | undefined) ?? null,
        eventType: envelope.type,
        notificationStatus: update.notificationStatus as string | undefined,
        occurredAt: envelope.occurredAt,
      });
    });
  }

  /**
   * Turns a projected change into a line of history.
   *
   * Delivery outcomes get their own actions because they are not status changes -
   * a completed document whose webhook failed is still completed, and flattening
   * both into STATUS_CHANGED would lose that distinction.
   */
  private async recordAudit(
    manager: EventContext['manager'],
    before: Document,
    update: QueryDeepPartialEntity<Document>,
    envelope: EventContext['envelope'],
  ): Promise<void> {
    const notificationStatus = update.notificationStatus as string | undefined;

    const action =
      notificationStatus === 'DELIVERED'
        ? AuditAction.NotificationDelivered
        : notificationStatus === 'UNDELIVERABLE'
          ? AuditAction.NotificationFailed
          : AuditAction.StatusChanged;

    const toStatus = (update.status as DocumentStatus | undefined) ?? null;

    // A projection that changed nothing observable is not worth a line.
    if (action === AuditAction.StatusChanged && (toStatus === null || toStatus === before.status)) {
      return;
    }

    await this.audit.record(manager, {
      documentId: before.id,
      customerId: before.customerId,
      correlationId: envelope.correlationId,
      action,
      actor: AuditActor.Pipeline,
      fromStatus: action === AuditAction.StatusChanged ? before.status : null,
      toStatus: action === AuditAction.StatusChanged ? toStatus : null,
      eventType: envelope.type,
      eventId: envelope.id,
      attempt: envelope.attempt,
      detail: DocumentProjectionService.auditDetail(update),
    });
  }

  /** The subset of a projection worth keeping in history, minus bulky result blobs. */
  private static auditDetail(
    update: QueryDeepPartialEntity<Document>,
  ): Record<string, unknown> | null {
    const detail: Record<string, unknown> = {};

    if (update.errorCode !== undefined) {
      detail.errorCode = update.errorCode;
    }

    if (update.errorMessage !== undefined) {
      detail.errorMessage = update.errorMessage;
    }

    if (update.failureReason !== undefined) {
      detail.failureReason = update.failureReason;
    }

    if (update.notificationAttempts !== undefined) {
      detail.notificationAttempts = update.notificationAttempts;
    }

    if (update.notificationAttemptLog !== undefined) {
      detail.attemptLog = update.notificationAttemptLog;
    }

    return Object.keys(detail).length > 0 ? detail : null;
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
          resultText: envelope.payload.resultText ?? null,
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
