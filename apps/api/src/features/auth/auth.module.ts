import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { AuthService } from './services';
import { ApiKeyStrategy } from './strategies';

/**
 * Server-to-server authentication for customer systems.
 *
 * Only the `x-api-key` strategy remains: the pipeline is machine-to-machine, so
 * there is no interactive sign-in, session or user model to support.
 */
@Module({
  imports: [PassportModule],
  providers: [AuthService, ApiKeyStrategy],
  exports: [AuthService],
})
export class AuthModule {}
