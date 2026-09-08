import { BaseLogger, NestLoggerAdapter } from '@app/logger';
import { NestFactory } from '@nestjs/core';
import { WsAdapter } from '@nestjs/platform-ws';
import cookieParser from 'cookie-parser';

import { AppModule } from './app/app.module';
import envConfig from './config/env.config';
import configureSwagger from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Route framework logs through the shared BaseLogger abstraction
  app.useLogger(new NestLoggerAdapter(app.get(BaseLogger)));

  // Lets MessagingBootstrap close AMQP channels so in-flight messages are
  // redelivered rather than lost on shutdown.
  app.enableShutdownHooks();

  // Native ws rather than socket.io, so the browser can use its built-in WebSocket.
  app.useWebSocketAdapter(new WsAdapter(app));

  app.use(cookieParser());

  const { port, enableSwagger, allowedOrigins } = envConfig();

  if (enableSwagger) {
    await configureSwagger(app);
  }

  if (allowedOrigins.length > 0) {
    app.enableCors({ origin: allowedOrigins, credentials: true });
  }

  await app.listen(port);
}

void bootstrap();
