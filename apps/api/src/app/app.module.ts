import { Queue } from '@app/contracts';
import { LoggerModule } from '@app/logger';
import { MessagingModule } from '@app/messaging';
import { ClassSerializerInterceptor, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';

import { getTypeOrmModuleOptions } from 'src/config/db.config';
import envConfig from 'src/config/env.config';
import { AuthModule } from 'src/features/auth/auth.module';
import { PassportOptionsModule } from 'src/features/auth/passport-options.module';
import { RequestContextMiddleware } from 'src/features/common/middleware/request-context.middleware';
import { CustomerSettingsModule } from 'src/features/customer-settings/customer-settings.module';
import { DocumentEventsController } from 'src/features/documents/controllers/document-events.controller';
import { DocumentsModule } from 'src/features/documents/documents.module';
import { FileUploadModule } from 'src/features/file-upload/file-upload.module';
import { MessagingOpsModule } from 'src/features/messaging-ops/messaging-ops.module';
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
    DocumentsModule,
    CustomerSettingsModule,
    MockReceiverModule,
    MessagingOpsModule,
    // The API consumes the same exchange purely to keep its read model current;
    // it publishes DocumentSubmitted and never instructs another service.
    MessagingModule.forRoot({
      ...envConfig().rabbitmq,
      queue: Queue.ApiProjection,
      controllers: [DocumentEventsController],
      imports: [DocumentsModule],
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
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // Applied to every route so no request is ever logged without an id.
    consumer.apply(RequestContextMiddleware).forRoutes('*splat');
  }
}
