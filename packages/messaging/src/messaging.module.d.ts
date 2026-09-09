import type { MessagingOptions } from './messaging.tokens';
import type { DynamicModule, Type } from '@nestjs/common';
export interface MessagingModuleOptions extends MessagingOptions {
    controllers?: Type<unknown>[];
    imports?: DynamicModule['imports'];
}
export declare class MessagingModule {
    static forRoot(options: MessagingModuleOptions): DynamicModule;
    private static toOptions;
}
//# sourceMappingURL=messaging.module.d.ts.map