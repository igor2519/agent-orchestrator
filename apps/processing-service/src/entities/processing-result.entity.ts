import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

/** This service's private record of each processing attempt and its outcome. */
@Entity({ name: 'processing_results' })
@Unique('uq_processing_document_attempt', ['documentId', 'attempt'])
@Index(['correlationId'])
export class ProcessingResult {
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
  outcome: 'PROCESSED' | 'FAILED';

  @Column({ length: 128 })
  processor: string;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, unknown> | null;

  @Column({ name: 'error_code', type: 'varchar', nullable: true })
  errorCode: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'boolean', default: false })
  permanent: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
