import { Queue } from '@app/contracts';
import { LoggerModule } from '@app/logger';
import { MessagingModule } from '@app/messaging';
import { ClassSerializerInterceptor, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { getTypeOrmModuleOptions } from 'src/config/db.config';
import envConfig from 'src/config/env.config';
import { AuthModule } from 'src/features/auth/auth.module';
import { PassportOptionsModule } from 'src/features/auth/passport-options.module';
import { DocumentEventsController } from 'src/features/documents/controllers/document-events.controller';
import { DocumentsModule } from 'src/features/documents/documents.module';
import { DummyDataModule } from 'src/features/dummy-data/dummy-data.module';
import { FileUploadModule } from 'src/features/file-upload/file-upload.module';
import { MockReceiverModule } from 'src/features/mock-receiver/mock-receiver.module';
import { UsersModule } from 'src/features/users/users.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    LoggerModule.forRoot({ service: 'api' }),
    ConfigModule.forRoot({
      load: [envConfig],
      cache: true,
      isGlobal: true,
    }),
    // TODO: test if this works with Nginx https://docs.nestjs.com/security/rate-limiting#proxies
    ThrottlerModule.forRoot({
      throttlers: [
        {
          // 20 requests per 10 seconds to protected endpoints
          ttl: 10000,
          limit: 20,
        },
      ],
    }),
    TypeOrmModule.forRoot(getTypeOrmModuleOptions()),
    FileUploadModule.forRoot(),
    PassportOptionsModule,
    AuthModule,
    UsersModule,
    DummyDataModule,
    DocumentsModule,
    MockReceiverModule,
    // The API consumes the same exchange purely to keep its read model current;
    // it publishes DocumentSubmitted and never instructs another service.
    MessagingModule.forRoot({
      ...envConfig().rabbitmq,
      queue: Queue.ApiProjection,
      controllers: [DocumentEventsController],
      // The API is the only service serving HTTP, so it hosts the ops endpoints.
      exposeOpsController: true,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ClassSerializerInterceptor,
    },
  ],
})
export class AppModule {}
