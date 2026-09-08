import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DeliveryAttempt } from './entities/delivery-attempt.entity';
import { NotificationDelivery } from './entities/notification-delivery.entity';
import { BaseNotificationProvider } from './providers/base-notification-provider';
import {
  NOTIFICATION_PROVIDERS,
  NotificationProviderRegistry,
} from './providers/notification-provider.registry';
import { WebhookProvider } from './providers/webhook.provider';
import { WebsocketProvider } from './providers/websocket.provider';
import { DeliveryAttemptsRepository } from './repositories/delivery-attempts.repository';
import { NotificationDeliveriesRepository } from './repositories/notification-deliveries.repository';
import { DeliveryScheduler } from './services/delivery-scheduler.service';
import { NotificationDeliveryService } from './services/notification-delivery.service';
import { NotificationIntakeService } from './services/notification-intake.service';

/**
 * Delivery strategies.
 *
 * Adding a channel means writing a `BaseNotificationProvider` subclass and listing
 * it here. Intake creates a delivery per applicable provider, and the delivery
 * service runs whichever one owns each row - neither needs changing.
 */
const NOTIFICATION_PROVIDER_CLASSES = [WebhookProvider, WebsocketProvider];

@Module({
  imports: [TypeOrmModule.forFeature([NotificationDelivery, DeliveryAttempt])],
  providers: [
    ...NOTIFICATION_PROVIDER_CLASSES,
    {
      provide: NOTIFICATION_PROVIDERS,
      useFactory: (...providers: BaseNotificationProvider[]) => providers,
      inject: NOTIFICATION_PROVIDER_CLASSES,
    },
    NotificationProviderRegistry,
    NotificationDeliveriesRepository,
    DeliveryAttemptsRepository,
    NotificationDeliveryService,
    NotificationIntakeService,
    DeliveryScheduler,
  ],
  exports: [
    NotificationDeliveryService,
    NotificationIntakeService,
    NotificationProviderRegistry,
    NotificationDeliveriesRepository,
    DeliveryAttemptsRepository,
    TypeOrmModule,
  ],
})
export class NotificationModule {}
