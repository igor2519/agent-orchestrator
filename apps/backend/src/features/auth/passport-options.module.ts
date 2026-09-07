import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

/**
 * From @nestjs/passport 11 onwards every AuthGuard mixin resolves
 * `AuthModuleOptions` through DI, and only `PassportModule.register()` provides
 * it — a bare `PassportModule` import declares no providers at all.
 *
 * Guards are instantiated in the module of the controller that uses them, so
 * registering Passport once globally keeps `@Authorized()` and
 * `@RequireApiKey()` usable from any feature module without each one having to
 * import Passport itself.
 */
@Global()
@Module({
  imports: [PassportModule.register({})],
  exports: [PassportModule],
})
export class PassportOptionsModule {}
