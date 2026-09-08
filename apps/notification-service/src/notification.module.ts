import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DeliveryWorker } from './delivery/delivery-worker.service';
import { WebhookClient } from './delivery/webhook-client';
import { DeliveryAttempt } from './entities/delivery-attempt.entity';
import { NotificationDelivery } from './entities/notification-delivery.entity';

/**
 * Webhook delivery. No HTTP controllers: the outbound call is made by
 * {@link DeliveryWorker}, and delivery outcomes reach the API on the
 * NotificationDelivered / NotificationFailed events rather than through a
 * cross-service query.
 */
@Module({
  imports: [TypeOrmModule.forFeature([NotificationDelivery, DeliveryAttempt])],
  providers: [WebhookClient, DeliveryWorker],
  exports: [WebhookClient, TypeOrmModule],
})
export class NotificationModule {}
