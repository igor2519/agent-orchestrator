import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

import type { OcrOutcome, ValidationIssue } from '@app/contracts';

/**
 * This service's own record of what it extracted and decided.
 *
 * The service keeps its own database and never reads the API's; everything it
 * needs arrives on the event. The unique constraint on
 * `(documentId, attempt)` makes a repeated attempt a no-op rather than a
 * second row.
 */
@Entity({ name: 'ocr_results' })
@Unique('uq_ocr_document_attempt', ['documentId', 'attempt'])
@Index(['correlationId'])
export class OcrResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  @Index()
  documentId: string;

  @Column({ name: 'correlation_id', type: 'uuid' })
  correlationId: string;

  @Column({ name: 'document_reference' })
  documentReference: string;

  @Column({ name: 'document_type' })
  documentType: string;

  @Column({ type: 'int' })
  attempt: number;

  @Column({ length: 32 })
  outcome: 'VALIDATED' | 'VALIDATION_FAILED';

  @Column({ type: 'jsonb', nullable: true })
  ocr: OcrOutcome | null;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  issues: ValidationIssue[];

  @Column({ name: 'validators_executed', type: 'jsonb', default: () => "'[]'::jsonb" })
  validatorsExecuted: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
