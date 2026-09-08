import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { NotificationDelivery } from './notification-delivery.entity';

/**
 * Append-only log of every webhook call made, successful or not.
 *
 * This is what makes delivery outcomes auditable: an operator can see each
 * attempt's status code, latency and error rather than inferring from counters.
 */
@Entity({ name: 'delivery_attempts' })
@Index(['deliveryId', 'attemptNumber'])
export class DeliveryAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'delivery_id', type: 'uuid' })
  deliveryId: string;

  @ManyToOne(() => NotificationDelivery, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'delivery_id' })
  delivery: NotificationDelivery;

  @Column({ name: 'attempt_number', type: 'int' })
  attemptNumber: number;

  @Column({ name: 'status_code', type: 'int', nullable: true })
  statusCode: number | null;

  @Column({ name: 'latency_ms', type: 'int' })
  latencyMs: number;

  @Column({ type: 'boolean' })
  succeeded: boolean;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  /** Truncated response body, enough to diagnose without storing customer data. */
  @Column({ name: 'response_snippet', type: 'text', nullable: true })
  responseSnippet: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
