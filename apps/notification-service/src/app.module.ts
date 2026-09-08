import { Queue } from '@app/contracts';
import { LoggerModule } from '@app/logger';
import { MessagingModule } from '@app/messaging';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { getTypeOrmModuleOptions } from './config/db.config';
import envConfig from './config/env.config';
import { NotificationEventsController } from './controllers/notification-events.controller';
import { NotificationModule } from './notification.module';

/**
 * Message-only service: no HTTP surface. Its sole entry point is the
 * `notification.documents` queue, consumed by NotificationEventsController.
 */
@Module({
  imports: [
    LoggerModule.forRoot({ service: 'notification-service' }),
    ConfigModule.forRoot({ load: [envConfig], cache: true, isGlobal: true }),
    TypeOrmModule.forRoot(getTypeOrmModuleOptions()),
    NotificationModule,
    MessagingModule.forRoot({
      ...envConfig().rabbitmq,
      queue: Queue.Notification,
      controllers: [NotificationEventsController],
      imports: [NotificationModule],
    }),
  ],
})
export class AppModule {}
