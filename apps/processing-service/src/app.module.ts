import { Queue } from '@app/contracts';
import { LoggerModule } from '@app/logger';
import { MessagingModule } from '@app/messaging';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { getTypeOrmModuleOptions } from './config/db.config';
import envConfig from './config/env.config';
import { ProcessingEventsController } from './controllers/processing-events.controller';
import { ProcessingModule } from './processing.module';

/**
 * Message-only service: no HTTP surface. Its sole entry point is the
 * `processing.documents` queue, consumed by ProcessingEventsController.
 */
@Module({
  imports: [
    LoggerModule.forRoot({ service: 'processing-service' }),
    ConfigModule.forRoot({ load: [envConfig], cache: true, isGlobal: true }),
    TypeOrmModule.forRoot(getTypeOrmModuleOptions()),
    ProcessingModule,
    MessagingModule.forRoot({
      ...envConfig().rabbitmq,
      queue: Queue.Processing,
      controllers: [ProcessingEventsController],
      imports: [ProcessingModule],
    }),
  ],
})
export class AppModule {}
