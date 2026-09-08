import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

/** Records callbacks delivered to the built-in mock receiver, for demos and tests. */
@Entity({ name: 'received_callbacks' })
@Index(['documentId'])
export class ReceivedCallback {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'uuid', nullable: true })
  documentId: string | null;

  @Column({ name: 'correlation_id', type: 'uuid', nullable: true })
  correlationId: string | null;

  @Column({ name: 'event_type', type: 'varchar', nullable: true })
  eventType: string | null;

  @Column({ name: 'signature_valid', type: 'boolean' })
  signatureValid: boolean;

  @Column({ type: 'jsonb' })
  body: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
