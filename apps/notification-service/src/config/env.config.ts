import { registerAs } from '@nestjs/config';

const toNumber = (value: string, fallback: number) => {
  const parsed = Number(value);

  return !value || Number.isNaN(parsed) ? fallback : parsed;
};

const envConfig = registerAs('env', () => ({
  port: toNumber(process.env.PORT || '', 3013),
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: toNumber(process.env.DATABASE_PORT || '', 5432),
    username: process.env.DATABASE_USERNAME || '',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'notification_db',
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    prefetch: toNumber(process.env.RABBITMQ_PREFETCH || '', 10),
    relayIntervalMs: toNumber(process.env.OUTBOX_RELAY_INTERVAL_MS || '', 1000),
    relayBatchSize: toNumber(process.env.OUTBOX_RELAY_BATCH_SIZE || '', 50),
    relayMaxAttempts: toNumber(process.env.OUTBOX_RELAY_MAX_ATTEMPTS || '', 10),
  },
  maxProcessingAttempts: toNumber(process.env.MAX_PROCESSING_ATTEMPTS || '', 5),
  /** Public base URL of the API, used to build the result link sent to customers. */
  publicApiUrl: process.env.PUBLIC_API_URL || 'http://localhost:3001',
  webhook: {
    /** Customers verify this signature to prove the callback came from us. */
    signingSecret: process.env.WEBHOOK_SIGNING_SECRET || 'local-dev-secret',
    timeoutMs: toNumber(process.env.WEBHOOK_TIMEOUT_MS || '', 5000),
    maxAttempts: toNumber(process.env.WEBHOOK_MAX_ATTEMPTS || '', 5),
    pollIntervalMs: toNumber(process.env.WEBHOOK_POLL_INTERVAL_MS || '', 1000),
    batchSize: toNumber(process.env.WEBHOOK_BATCH_SIZE || '', 20),
  },
}));

export default envConfig;
