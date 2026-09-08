import { createHash, randomUUID } from 'node:crypto';

import { DocumentStatus, EventType, isTerminalStatus } from '@app/contracts';
import { BaseLogger } from '@app/logger';
import { OutboxService } from '@app/messaging';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { DocumentsRepository } from '../repositories/documents.repository';
import { IdempotencyKeysRepository } from '../repositories/idempotency-keys.repository';

import { ContentHashService } from './content-hash.service';

import type { DocumentAcceptedDto } from '../dto';
import type { Document } from '../entities/document.entity';
import type { ListDocumentsInput, SubmitDocumentInput } from '../joi-validations';
import type { PaginationResponseDto } from 'src/features/common/dto';

const UNIQUE_VIOLATION = '23505';

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === UNIQUE_VIOLATION;

@Injectable()
export class DocumentsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly documents: DocumentsRepository,
    private readonly idempotencyKeys: IdempotencyKeysRepository,
    private readonly contentHashes: ContentHashService,
    private readonly outbox: OutboxService,
    private readonly logger: BaseLogger,
  ) {}

  /**
   * Accepts a submission and publishes `DocumentSubmitted`.
   *
   * The document row, the idempotency record and the outbox row are written in a
   * single transaction, so it is impossible to end up with a stored document whose
   * event was never emitted (work silently stalls) or an emitted event with no
   * document (downstream services process a phantom).
   */
  async submit(input: SubmitDocumentInput, idempotencyKey: string): Promise<DocumentAcceptedDto> {
    const fingerprint = DocumentsService.fingerprint(input);
    const replay = await this.findReplay(input.customerId, idempotencyKey, fingerprint);

    if (replay) {
      return replay;
    }

    // Content-level deduplication: the same file is processed once per customer,
    // however many times it is submitted and under whatever reference.
    const contentHash = this.contentHashes.hash(input);
    const alreadyProcessed = await this.documents.findProcessableDuplicate(
      input.customerId,
      contentHash,
    );

    if (alreadyProcessed) {
      this.logger.log('Submission matched an already-processed file, reusing it', {
        correlationId: alreadyProcessed.correlationId,
        documentId: alreadyProcessed.id,
        contentHash,
      });

      return {
        id: alreadyProcessed.id,
        status: alreadyProcessed.status,
        correlationId: alreadyProcessed.correlationId,
        duplicate: true,
        deduplicatedBy: 'CONTENT_HASH',
      };
    }

    const correlationId = randomUUID();

    try {
      const document = await this.dataSource.transaction(async (manager) => {
        const saved = await this.documents.save(manager, {
          customerId: input.customerId,
          documentReference: input.documentReference,
          documentType: input.documentType,
          payload: input.payload ?? null,
          payloadUri: input.payloadUri ?? null,
          callbackUrl: input.callbackUrl,
          contentHash,
          status: DocumentStatus.Received,
          correlationId,
          attempts: 1,
        });

        await this.idempotencyKeys.claim(manager, {
          customerId: input.customerId,
          key: idempotencyKey,
          requestFingerprint: fingerprint,
          documentId: saved.id,
        });

        await this.outbox.enqueue(manager, {
          type: EventType.DocumentSubmitted,
          documentId: saved.id,
          correlationId,
          payload: {
            customerId: input.customerId,
            documentReference: input.documentReference,
            documentType: input.documentType,
            contentHash,
            payload: input.payload,
            payloadUri: input.payloadUri,
            callbackUrl: input.callbackUrl,
          },
        });

        return saved;
      });

      this.logger.log('Document submitted', {
        correlationId,
        documentId: document.id,
        customerId: input.customerId,
      });

      return { id: document.id, status: document.status, correlationId, duplicate: false };
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }

      // Another request with the same key committed first. Return its document
      // rather than starting a second flow.
      const concurrent = await this.findReplay(input.customerId, idempotencyKey, fingerprint);

      if (!concurrent) {
        throw error;
      }

      return concurrent;
    }
  }

  private async findReplay(
    customerId: string,
    key: string,
    fingerprint: string,
  ): Promise<DocumentAcceptedDto | null> {
    const record = await this.idempotencyKeys.findByKey(customerId, key);

    if (!record) {
      return null;
    }

    if (record.requestFingerprint !== fingerprint) {
      throw new ConflictException('Idempotency-Key was already used with a different request body');
    }

    const document = await this.documents.findById(record.documentId);

    if (!document) {
      return null;
    }

    return {
      id: document.id,
      status: document.status,
      correlationId: document.correlationId,
      duplicate: true,
      deduplicatedBy: 'IDEMPOTENCY_KEY',
    };
  }

  /** Stable hash of the submission, used to detect key reuse with a different body. */
  private static fingerprint(input: SubmitDocumentInput): string {
    const canonical = JSON.stringify({
      customerId: input.customerId,
      documentReference: input.documentReference,
      documentType: input.documentType,
      payload: input.payload ?? null,
      payloadUri: input.payloadUri ?? null,
      callbackUrl: input.callbackUrl,
    });

    return createHash('sha256').update(canonical).digest('hex');
  }

  async findOne(id: string): Promise<Document> {
    const document = await this.documents.findById(id);

    if (!document) {
      throw new NotFoundException(`Document ${id} was not found`);
    }

    return document;
  }

  async list(query: ListDocumentsInput): Promise<PaginationResponseDto<Document>> {
    const [data, total] = await this.documents.search(query);

    return { data, total, limit: query.limit, offset: query.offset };
  }

  /**
   * Operator-initiated retry of a permanently failed document.
   *
   * Re-publishing `DocumentSubmitted` restarts the choreography from the top; the
   * new event carries a fresh id so consumers' inboxes do not mistake it for a
   * duplicate of the original run.
   */
  async retry(id: string): Promise<DocumentAcceptedDto> {
    return this.dataSource.transaction(async (manager) => {
      const document = await this.documents.findById(id, manager);

      if (!document) {
        throw new NotFoundException(`Document ${id} was not found`);
      }

      if (document.status !== DocumentStatus.Failed) {
        throw new BadRequestException(
          `Only failed documents can be retried; document is ${document.status}`,
        );
      }

      const attempts = document.attempts + 1;

      await this.documents.transitionFrom(manager, id, DocumentStatus.Failed, {
        status: DocumentStatus.Received,
        attempts,
        failureReason: null,
        errorCode: null,
        errorMessage: null,
        failedAt: null,
      });

      await this.outbox.enqueue(manager, {
        type: EventType.DocumentSubmitted,
        documentId: document.id,
        correlationId: document.correlationId,
        attempt: attempts,
        payload: {
          customerId: document.customerId,
          documentReference: document.documentReference,
          documentType: document.documentType,
          contentHash: document.contentHash,
          payload: document.payload ?? undefined,
          payloadUri: document.payloadUri ?? undefined,
          callbackUrl: document.callbackUrl,
        },
      });

      this.logger.log('Document retry requested', {
        correlationId: document.correlationId,
        documentId: document.id,
        attempt: attempts,
      });

      return {
        id: document.id,
        status: DocumentStatus.Received,
        correlationId: document.correlationId,
        duplicate: false,
      };
    });
  }

  /** Guards the projection against events that arrive after a terminal status. */
  static canApply(current: DocumentStatus): boolean {
    return !isTerminalStatus(current);
  }
}
