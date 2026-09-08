import { NotificationMode } from '@app/contracts';
import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

/**
 * Per-customer notification preferences.
 *
 * Keyed by customer rather than surrogate id: there is exactly one settings row per
 * customer, so the natural key removes a lookup and makes the uniqueness structural.
 */
@Entity({ name: 'customer_settings' })
export class CustomerSettings {
  @ApiProperty()
  @PrimaryColumn({ name: 'customer_id', length: 128 })
  customerId: string;

  @ApiProperty({
    required: false,
    nullable: true,
    description: 'Where webhooks are delivered. Required before WEBHOOK mode can be selected.',
  })
  @Column({ name: 'callback_url', type: 'varchar', length: 2000, nullable: true })
  callbackUrl: string | null;

  @ApiProperty({ enum: NotificationMode, enumName: 'NotificationMode' })
  @Column({
    name: 'notification_mode',
    type: 'varchar',
    length: 16,
    default: NotificationMode.Websocket,
  })
  notificationMode: NotificationMode;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
