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

import { CustomerSettingsService } from 'src/features/customer-settings/customer-settings.service';

import { DocumentsRepository } from '../repositories/documents.repository';
import { IdempotencyKeysRepository } from '../repositories/idempotency-keys.repository';

import { ContentHashService } from './content-hash.service';

import type { MulterFile } from '../../common/types';
import type { DocumentAcceptedDto } from '../dto';
import type { Document } from '../entities/document.entity';
import type { ListDocumentsInput, SubmitDocumentInput } from '../joi-validations';
import type { NotificationMode } from '@app/contracts';
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
    private readonly settings: CustomerSettingsService,
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
    const settings = await this.settings.get(input.customerId);
    const callbackUrl = input.callbackUrl ?? settings.callbackUrl;
    const duplicate = await this.documents.findProcessableDuplicate(input.customerId, contentHash);

    if (duplicate) {
      return this.announceDuplicate(duplicate, {
        customerId: input.customerId,
        documentReference: input.documentReference,
        documentType: input.documentType,
        contentHash,
        notificationMode: settings.notificationMode,
        callbackUrl,
      });
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
          callbackUrl,
          contentHash,
          notificationMode: settings.notificationMode,
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
            notificationMode: settings.notificationMode,
            payload: input.payload,
            payloadUri: input.payloadUri,
            callbackUrl: callbackUrl ?? '',
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

  /**
   * Tells the customer their file was already processed, without re-running it.
   *
   * The notification still goes out through their configured channels, because
   * "we already have this" is an answer they asked for - silently returning the
   * old document would leave a submission that never produced a callback.
   */
  private async announceDuplicate(
    original: Document,
    context: {
      customerId: string;
      documentReference: string;
      documentType: string;
      contentHash: string;
      notificationMode: NotificationMode;
      callbackUrl: string | null;
    },
  ): Promise<DocumentAcceptedDto> {
    await this.dataSource.transaction(async (manager) => {
      await this.outbox.enqueue(manager, {
        type: EventType.DocumentDuplicateDetected,
        documentId: original.id,
        correlationId: original.correlationId,
        payload: {
          customerId: context.customerId,
          documentReference: context.documentReference,
          documentType: context.documentType,
          contentHash: context.contentHash,
          notificationMode: context.notificationMode,
          callbackUrl: context.callbackUrl ?? '',
          originalDocumentId: original.id,
          originalStatus: original.status,
        },
      });
    });

    this.logger.log('Submission matched an already-processed file', {
      correlationId: original.correlationId,
      documentId: original.id,
      contentHash: context.contentHash,
    });

    return {
      id: original.id,
      status: original.status,
      correlationId: original.correlationId,
      duplicate: true,
      deduplicatedBy: 'CONTENT_HASH',
    };
  }

  /**
   * Accepts an uploaded file.
   *
   * The hash is taken over the raw bytes rather than a JSON rendering, so the same
   * file re-uploaded under any name is recognised. The content itself is carried
   * inline for the pipeline to read.
   */
  async submitFile(
    file: MulterFile,
    input: { customerId: string; documentReference?: string; notificationMode?: NotificationMode },
    idempotencyKey: string,
  ): Promise<DocumentAcceptedDto> {
    const contentHash = this.contentHashes.hashFile(file.buffer);
    const settings = await this.settings.get(input.customerId);
    const notificationMode = input.notificationMode ?? settings.notificationMode;
    const documentReference = input.documentReference ?? file.originalname;
    const documentType = DocumentsService.documentTypeFor(file.mimetype);

    const duplicate = await this.documents.findProcessableDuplicate(input.customerId, contentHash);

    if (duplicate) {
      return this.announceDuplicate(duplicate, {
        customerId: input.customerId,
        documentReference,
        documentType,
        contentHash,
        notificationMode,
        callbackUrl: settings.callbackUrl,
      });
    }

    const correlationId = randomUUID();
    const fileInfo = {
      fileName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    };

    try {
      const document = await this.dataSource.transaction(async (manager) => {
        const saved = await this.documents.save(manager, {
          customerId: input.customerId,
          documentReference,
          documentType,
          payload: { contentBase64: file.buffer.toString('base64') },
          payloadUri: null,
          callbackUrl: settings.callbackUrl,
          contentHash,
          notificationMode,
          fileName: fileInfo.fileName,
          mimeType: fileInfo.mimeType,
          fileSizeBytes: fileInfo.sizeBytes,
          status: DocumentStatus.Received,
          correlationId,
          attempts: 1,
        });

        await this.idempotencyKeys.claim(manager, {
          customerId: input.customerId,
          key: idempotencyKey,
          requestFingerprint: contentHash,
          documentId: saved.id,
        });

        await this.outbox.enqueue(manager, {
          type: EventType.DocumentSubmitted,
          documentId: saved.id,
          correlationId,
          payload: {
            customerId: input.customerId,
            documentReference,
            documentType,
            contentHash,
            notificationMode,
            file: fileInfo,
            payload: { contentBase64: file.buffer.toString('base64') },
            callbackUrl: settings.callbackUrl ?? '',
          },
        });

        return saved;
      });

      this.logger.log('File submitted', {
        correlationId,
        documentId: document.id,
        fileName: fileInfo.fileName,
        sizeBytes: fileInfo.sizeBytes,
      });

      return { id: document.id, status: document.status, correlationId, duplicate: false };
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }

      const concurrent = await this.idempotencyKeys.findByKey(input.customerId, idempotencyKey);
      const existing = concurrent && (await this.documents.findById(concurrent.documentId));

      if (!existing) {
        throw error;
      }

      return {
        id: existing.id,
        status: existing.status,
        correlationId: existing.correlationId,
        duplicate: true,
        deduplicatedBy: 'IDEMPOTENCY_KEY',
      };
    }
  }

  /** Maps an accepted upload's mime type onto the document type the pipeline routes on. */
  private static documentTypeFor(mimeType: string): string {
    if (mimeType === 'application/pdf') {
      return 'pdf';
    }

    if (mimeType.startsWith('image/')) {
      return 'image';
    }

    if (mimeType === 'text/plain') {
      return 'text';
    }

    return 'word';
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

  /** The processed output, rendered as a downloadable text file. */
  async getResult(id: string): Promise<{ fileName: string; content: string }> {
    const document = await this.findOne(id);

    if (document.status !== DocumentStatus.Completed || document.resultText === null) {
      throw new NotFoundException(`Document ${id} has no processed result yet`);
    }

    const base = (document.fileName ?? document.documentReference).replace(/\.[^.]+$/u, '');

    return { fileName: `${base}.processed.txt`, content: document.resultText };
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
          notificationMode: document.notificationMode,
          payload: document.payload ?? undefined,
          payloadUri: document.payloadUri ?? undefined,
          callbackUrl: document.callbackUrl ?? '',
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
