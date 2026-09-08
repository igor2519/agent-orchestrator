import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * Record of an event this service has already processed.
 *
 * The row is written inside the same transaction as the business change, so
 * "work done" and "event consumed" commit together. A redelivered message then
 * finds its id here and is acknowledged without repeating the work.
 *
 * `consumer` is part of the key because several queues in one service may
 * legitimately consume the same event.
 */
@Entity({ name: 'inbox_messages' })
@Index(['processedAt'])
export class InboxMessage {
  @PrimaryColumn('uuid', { name: 'event_id' })
  eventId: string;

  @PrimaryColumn({ name: 'consumer', length: 128 })
  consumer: string;

  @Column({ length: 64 })
  type: string;

  @CreateDateColumn({ name: 'processed_at', type: 'timestamptz' })
  processedAt: Date;
}
