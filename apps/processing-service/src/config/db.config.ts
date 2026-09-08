import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

import envConfig from './env.config';

import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const getTypeOrmModuleOptions = (): TypeOrmModuleOptions => ({
  type: 'postgres',
  autoLoadEntities: true,
  synchronize: false,
  migrationsRun: true,
  migrations: [`${__dirname}/../migrations/*.{ts,js}`],
  namingStrategy: new SnakeNamingStrategy(),
  migrationsTransactionMode: 'each',
  logging: ['error'],
  ...envConfig().database,
});
