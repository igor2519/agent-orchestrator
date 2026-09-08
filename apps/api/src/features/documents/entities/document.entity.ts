import { DocumentStatus, FailureReason } from '@app/contracts';
import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index } from 'typeorm';

import { AuditEntity } from 'src/features/common/entities/audit.entity';

import type { DeliveryAttemptSummary } from '@app/contracts';

/**
 * The API service's view of a document's journey.
 *
 * This is a projection, not a workflow: every field after `status` is written in
 * reaction to an event published by whichever service did the work. The API never
 * tells OCR, Processing or Notification what to do.
 */
@Entity({ name: 'documents' })
@Index(['customerId', 'status', 'createdAt'])
@Index(['correlationId'])
@Index(['customerId', 'contentHash'])
export class Document extends AuditEntity {
  constructor(partial?: Partial<Document>) {
    super();
    Object.assign(this, partial);
  }

  @ApiProperty()
  @Column({ name: 'customer_id' })
  @Index()
  customerId: string;

  @ApiProperty({ description: 'Synthetic reference supplied by the customer system' })
  @Column({ name: 'document_reference' })
  documentReference: string;

  @ApiProperty()
  @Column({ name: 'document_type' })
  documentType: string;

  @ApiProperty({ description: 'SHA-256 of the submitted content, used to process a file once' })
  @Column({ name: 'content_hash', length: 64 })
  contentHash: string;

  @ApiProperty({ selfRequired: false, type: 'object', additionalProperties: true })
  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @ApiProperty({ required: false })
  @Column({ name: 'payload_uri', type: 'varchar', nullable: true })
  payloadUri: string | null;

  @ApiProperty()
  @Column({ name: 'callback_url' })
  callbackUrl: string;

  @ApiProperty({ enum: DocumentStatus, enumName: 'DocumentStatus' })
  @Column({ type: 'varchar', length: 32, default: DocumentStatus.Received })
  status: DocumentStatus;

  @ApiProperty({ required: false, enum: FailureReason, enumName: 'FailureReason' })
  @Column({ name: 'failure_reason', type: 'varchar', length: 32, nullable: true })
  failureReason: FailureReason | null;

  @ApiProperty({ description: 'Ties every event of this flow together across services' })
  @Column({ name: 'correlation_id', type: 'uuid' })
  correlationId: string;

  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  attempts: number;

  @ApiProperty({ selfRequired: false, type: 'object', additionalProperties: true })
  @Column({ name: 'ocr_result', type: 'jsonb', nullable: true })
  ocrResult: Record<string, unknown> | null;

  @ApiProperty({ selfRequired: false, type: 'object', additionalProperties: true })
  @Column({ name: 'processing_result', type: 'jsonb', nullable: true })
  processingResult: Record<string, unknown> | null;

  @ApiProperty({ required: false })
  @Column({ name: 'error_code', type: 'varchar', nullable: true })
  errorCode: string | null;

  @ApiProperty({ required: false })
  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @ApiProperty({ required: false, description: 'Latest webhook delivery outcome' })
  @Column({ name: 'notification_status', type: 'varchar', length: 32, nullable: true })
  notificationStatus: string | null;

  @ApiProperty()
  @Column({ name: 'notification_attempts', type: 'int', default: 0 })
  notificationAttempts: number;

  @ApiProperty({
    required: false,
    type: 'array',
    items: { type: 'object', additionalProperties: true },
    description: 'Every webhook attempt, carried here on the notification event',
  })
  @Column({ name: 'notification_attempt_log', type: 'jsonb', nullable: true })
  notificationAttemptLog: DeliveryAttemptSummary[] | null;

  @ApiProperty({ required: false })
  @Column({ name: 'validated_at', type: 'timestamptz', nullable: true })
  validatedAt: Date | null;

  @ApiProperty({ required: false })
  @Column({ name: 'processing_started_at', type: 'timestamptz', nullable: true })
  processingStartedAt: Date | null;

  @ApiProperty({ required: false })
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @ApiProperty({ required: false })
  @Column({ name: 'failed_at', type: 'timestamptz', nullable: true })
  failedAt: Date | null;
}
