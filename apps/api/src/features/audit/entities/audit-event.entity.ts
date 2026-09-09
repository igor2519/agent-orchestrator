import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

import { AuditAction, AuditActor } from '../constants/audit-action';

import type { DocumentStatus } from '@app/contracts';

/**
 * One immutable line in the document's history.
 *
 * Rows are only ever inserted. Nothing in this codebase updates or deletes one,
 * and the migration installs a trigger that rejects UPDATE and DELETE outright,
 * so the trail stays trustworthy even against a stray query run by hand.
 *
 * Each row is written in the same transaction as the change it describes, which
 * is what makes the trail complete: a state change cannot commit without its
 * audit line, and an audit line cannot survive a rolled-back change.
 */
@Entity({ name: 'audit_events' })
@Index('IDX_audit_events_document_sequence', ['documentId', 'sequence'])
@Index('IDX_audit_events_customer_recorded', ['customerId', 'recordedAt'])
export class AuditEvent {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Total order across the whole trail. `recordedAt` can tie when rows are
   * written inside one transaction, so readers sort on this instead.
   */
  @ApiProperty({ type: String, description: 'Monotonic ordering key' })
  @Column({ type: 'bigint', generated: 'increment' })
  sequence: string;

  @ApiProperty()
  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @ApiProperty()
  @Column({ name: 'customer_id', type: 'varchar' })
  customerId: string;

  @ApiProperty()
  @Column({ name: 'correlation_id', type: 'uuid' })
  correlationId: string;

  @ApiProperty({ enum: AuditAction, enumName: 'AuditAction' })
  @Column({ type: 'varchar', length: 64 })
  action: AuditAction;

  @ApiProperty({
    enum: AuditActor,
    enumName: 'AuditActor',
    description: 'Which service or role caused the entry',
  })
  @Column({ type: 'varchar', length: 32 })
  actor: AuditActor;

  @ApiProperty({ required: false, nullable: true })
  @Column({ name: 'from_status', type: 'varchar', length: 32, nullable: true })
  fromStatus: DocumentStatus | null;

  @ApiProperty({ required: false, nullable: true })
  @Column({ name: 'to_status', type: 'varchar', length: 32, nullable: true })
  toStatus: DocumentStatus | null;

  /** The domain event that triggered this entry, when one did. */
  @ApiProperty({ required: false, nullable: true })
  @Column({ name: 'event_type', type: 'varchar', length: 64, nullable: true })
  eventType: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Column({ name: 'event_id', type: 'uuid', nullable: true })
  eventId: string | null;

  @ApiProperty({ required: false, nullable: true })
  @Column({ type: 'int', nullable: true })
  attempt: number | null;

  @ApiProperty({ required: false, nullable: true, type: Object, additionalProperties: true })
  @Column({ type: 'jsonb', nullable: true })
  detail: Record<string, unknown> | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'recorded_at', type: 'timestamptz' })
  recordedAt: Date;
}
