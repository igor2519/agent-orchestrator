import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from 'typeorm';

/**
 * Maps a client-supplied `Idempotency-Key` to the document it created.
 *
 * The unique constraint is the concurrency control: two simultaneous retries of
 * the same submission both attempt the insert, one loses, and the loser reads back
 * the winner's document instead of starting a second flow. No lock required.
 *
 * `requestFingerprint` catches key reuse with a different body, which is a client
 * bug worth surfacing as a 409 rather than silently returning the wrong document.
 */
@Entity({ name: 'idempotency_keys' })
@Unique('uq_idempotency_customer_key', ['customerId', 'key'])
@Index(['createdAt'])
export class IdempotencyKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ length: 255 })
  key: string;

  @Column({ name: 'request_fingerprint', length: 64 })
  requestFingerprint: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
