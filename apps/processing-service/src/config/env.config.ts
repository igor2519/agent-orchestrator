import { registerAs } from '@nestjs/config';

const toNumber = (value: string, fallback: number) => {
  const parsed = Number(value);

  return !value || Number.isNaN(parsed) ? fallback : parsed;
};

const envConfig = registerAs('env', () => ({
  port: toNumber(process.env.PORT || '', 3012),
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    port: toNumber(process.env.DATABASE_PORT || '', 5432),
    username: process.env.DATABASE_USERNAME || '',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'processing_db',
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    prefetch: toNumber(process.env.RABBITMQ_PREFETCH || '', 10),
    relayIntervalMs: toNumber(process.env.OUTBOX_RELAY_INTERVAL_MS || '', 1000),
    relayBatchSize: toNumber(process.env.OUTBOX_RELAY_BATCH_SIZE || '', 50),
    relayMaxAttempts: toNumber(process.env.OUTBOX_RELAY_MAX_ATTEMPTS || '', 10),
  },
  maxProcessingAttempts: toNumber(process.env.MAX_PROCESSING_ATTEMPTS || '', 5),
}));

export default envConfig;
