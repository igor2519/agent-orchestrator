import { registerAs } from '@nestjs/config';

const mapEnvValues = {
  bool: (envValue: string) => envValue === 'true',
  number: (envValue: string, defaultValue: number) => {
    const value = Number(envValue);

    return !envValue || Number.isNaN(value) ? defaultValue : value;
  },
  array: (envValue: string, delimiter = ',') => {
    const values = envValue.split(delimiter).filter(Boolean);

    return values;
  },
};

const defaultDbPort = 5432;
const defaultAppPort = 3001;
const defaultMailhogPort = 1025;
const defaultPrefetch = 10;
const defaultRelayIntervalMs = 1_000;
const defaultRelayBatchSize = 50;
const defaultRelayMaxAttempts = 10;

const envConfig = registerAs('env', () => ({
  port: mapEnvValues.number(process.env.PORT || '', defaultAppPort),
  appName: process.env.APP_NAME || '',
  enableSwagger: mapEnvValues.bool(process.env.ENABLE_SWAGGER || ''),
  frontendHostUrl: process.env.FRONTEND_HOST_URL || '',
  backendHostUrl: process.env.BACKEND_HOST_URL || '',
  allowedOrigins: mapEnvValues.array(process.env.ALLOWED_CORS_ORIGINS || ''),
  database: {
    host: process.env.DATABASE_HOST || '',
    port: mapEnvValues.number(process.env.DATABASE_PORT || '', defaultDbPort),
    username: process.env.DATABASE_USERNAME || '',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || '',
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    prefetch: mapEnvValues.number(process.env.RABBITMQ_PREFETCH || '', defaultPrefetch),
    relayIntervalMs: mapEnvValues.number(
      process.env.OUTBOX_RELAY_INTERVAL_MS || '',
      defaultRelayIntervalMs,
    ),
    relayBatchSize: mapEnvValues.number(
      process.env.OUTBOX_RELAY_BATCH_SIZE || '',
      defaultRelayBatchSize,
    ),
    relayMaxAttempts: mapEnvValues.number(
      process.env.OUTBOX_RELAY_MAX_ATTEMPTS || '',
      defaultRelayMaxAttempts,
    ),
  },
  webhook: {
    // Must match the notification service's WEBHOOK_SIGNING_SECRET so the mock
    // receiver can verify what that service signs.
    signingSecret: process.env.WEBHOOK_SIGNING_SECRET || 'local-dev-secret',
  },
  auth: {
    apiKey: process.env.API_KEY || '',
    jwtSecret: process.env.JWT_SECRET || '',
    otpJwtSecret: process.env.OTP_JWT_SECRET || '',
    otpTokenDuration: process.env.OTP_TOKEN_EXPIRATION || '',
  },
  aws: {
    bucketName: process.env.AWS_BUCKET_NAME || '',
    region: process.env.AWS_REGION || '',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    cdnDomain: process.env.AWS_CDN_DOMAIN || '',
  },
  mailhog: {
    host: process.env.MAILHOG_HOST || '',
    port: mapEnvValues.number(process.env.MAILHOG_PORT || '', defaultMailhogPort),
  },
  brevo: {
    host: process.env.BREVO_HOST || '',
    apiKey: process.env.BREVO_API_KEY || '',
  },
}));

export default envConfig;
