import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export const DeliveryStatus = {
  Pending: 'PENDING',
  Delivered: 'DELIVERED',
  Undeliverable: 'UNDELIVERABLE',
} as const;

export type DeliveryStatus = (typeof DeliveryStatus)[keyof typeof DeliveryStatus];

/**
 * One webhook that owes the customer a result.
 *
 * Delivery is tracked separately from the document's own status on purpose: a
 * document that completed successfully but whose webhook is failing is still a
 * completed document, and conflating the two would make "how many documents
 * succeeded" unanswerable.
 */
@Entity({ name: 'notification_deliveries' })
@Unique('uq_delivery_document_attempt', ['documentId', 'documentAttempt'])
@Index(['status', 'nextAttemptAt'])
export class NotificationDelivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  @Index()
  documentId: string;

  @Column({ name: 'correlation_id', type: 'uuid' })
  correlationId: string;

  /** The document's processing attempt this outcome belongs to. */
  @Column({ name: 'document_attempt', type: 'int' })
  documentAttempt: number;

  @Column({ name: 'callback_url' })
  callbackUrl: string;

  @Column({ name: 'event_type', length: 64 })
  eventType: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown>;

  @Column({ type: 'varchar', length: 32, default: DeliveryStatus.Pending })
  status: DeliveryStatus;

  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'next_attempt_at', type: 'timestamptz', default: () => 'now()' })
  nextAttemptAt: Date;

  @Column({ name: 'last_status_code', type: 'int', nullable: true })
  lastStatusCode: number | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
