import { Queue } from '@app/contracts';
import { LoggerModule } from '@app/logger';
import { MessagingModule } from '@app/messaging';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { getTypeOrmModuleOptions } from './config/db.config';
import envConfig from './config/env.config';
import { OcrEventsController } from './controllers/ocr-events.controller';
import { OcrModule } from './ocr.module';

/**
 * Message-only service: it exposes no HTTP surface. Its sole entry point is the
 * `ocr.documents` queue, consumed by OcrEventsController.
 */
@Module({
  imports: [
    LoggerModule.forRoot({ service: 'ocr-service' }),
    ConfigModule.forRoot({ load: [envConfig], cache: true, isGlobal: true }),
    TypeOrmModule.forRoot(getTypeOrmModuleOptions()),
    OcrModule,
    MessagingModule.forRoot({
      ...envConfig().rabbitmq,
      queue: Queue.Ocr,
      controllers: [OcrEventsController],
      // The controller resolves engines and validators from OcrModule's registries.
      imports: [OcrModule],
    }),
  ],
})
export class AppModule {}
