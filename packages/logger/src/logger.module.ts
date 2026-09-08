import { Global, Module } from '@nestjs/common';

import { BaseLogger } from './base-logger';
import { ConsoleLogger } from './console-logger';

export interface LoggerModuleOptions {
  service: string;
}

/**
 * Binds {@link BaseLogger} to its default implementation and makes it global, so
 * business code injects the abstraction and never reaches for `console`.
 *
 * Swapping the transport for the whole service is a one-line change here.
 */
@Global()
@Module({})
export class LoggerModule {
  static forRoot(options: LoggerModuleOptions) {
    return {
      module: LoggerModule,
      providers: [
        {
          provide: BaseLogger,
          useFactory: () => new ConsoleLogger(options.service),
        },
      ],
      exports: [BaseLogger],
    };
  }
}
