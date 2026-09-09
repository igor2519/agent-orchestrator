import { BaseLogger } from './base-logger';
import { ConsoleLogger } from './console-logger';
export interface LoggerModuleOptions {
    service: string;
}
export declare class LoggerModule {
    static forRoot(options: LoggerModuleOptions): {
        module: typeof LoggerModule;
        providers: {
            provide: typeof BaseLogger;
            useFactory: () => ConsoleLogger;
        }[];
        exports: (typeof BaseLogger)[];
    };
}
//# sourceMappingURL=logger.module.d.ts.map