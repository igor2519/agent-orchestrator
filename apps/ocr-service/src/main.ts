import { BaseLogger, NestLoggerAdapter } from '@app/logger';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

/**
 * Started as an application context rather than an HTTP server: this service is
 * driven entirely by RabbitMQ and has no HTTP endpoints to serve.
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });

  app.useLogger(new NestLoggerAdapter(app.get(BaseLogger)));
  // Lets MessagingBootstrap close channels on SIGTERM, so unacknowledged messages
  // are redelivered rather than lost.
  app.enableShutdownHooks();

  app.get(BaseLogger).log('OCR service ready, consuming ocr.documents');
}

void bootstrap();
