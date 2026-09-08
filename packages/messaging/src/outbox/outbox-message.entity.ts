import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

import type { AnyEventEnvelope } from '@app/contracts';

/**
 * An event that has been decided but not yet published.
 *
 * Writing it in the same transaction as the state change is what makes the
 * system reliable: there is no window in which the database says the work
 * happened but the event was lost, or vice versa. A relay publishes these rows
 * afterwards, with publisher confirms, and marks them sent.
 *
 * `availableAt` doubles as the retry scheduler - a delayed retry is just an
 * outbox row that is not yet due.
 */
@Entity({ name: 'outbox_messages' })
@Index(['publishedAt', 'availableAt'])
export class OutboxMessage {
  /** Also the event id carried in the envelope, and the consumers' dedup key. */
  @PrimaryColumn('uuid')
  id: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @Column({ length: 64 })
  type: string;

  @Column({ name: 'routing_key', length: 128 })
  routingKey: string;

  @Column({ type: 'jsonb' })
  envelope: AnyEventEnvelope;

  @Column({ name: 'correlation_id', type: 'uuid' })
  correlationId: string;

  @Column({ name: 'causation_id', type: 'uuid', nullable: true })
  causationId: string | null;

  /**
   * Strict insertion order. `created_at` cannot serve this purpose because
   * Postgres `now()` returns the transaction start time, so several rows written
   * in one transaction share a timestamp and their relative order would be
   * undefined - which would let a "processed" event overtake "processing started".
   */
  @Column({ type: 'bigint', generated: 'increment' })
  sequence: string;

  @Column({ name: 'available_at', type: 'timestamptz', default: () => 'now()' })
  availableAt: Date;

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  /** Publish attempts, distinct from business processing attempts. */
  @Column({ type: 'int', default: 0 })
  attempts: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
