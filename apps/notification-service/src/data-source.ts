import 'reflect-metadata';
import { InboxMessage, OutboxMessage } from '@app/messaging';
import { config as configDotenv } from 'dotenv';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

import envConfig from './config/env.config';

configDotenv();
const { database } = envConfig();

// Used by the TypeORM CLI to generate and run this service's own migrations.
export const AppDataSource = new DataSource({
  ...database,
  type: 'postgres',
  synchronize: false,
  logging: true,
  entities: [`${__dirname}/**/*.entity.ts`, InboxMessage, OutboxMessage],
  migrations: [`${__dirname}/migrations/*.ts`],
  migrationsTransactionMode: 'each',
  namingStrategy: new SnakeNamingStrategy(),
});
