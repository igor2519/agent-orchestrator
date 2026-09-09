import { Inject, Injectable } from '@nestjs/common';

import envConfig from 'src/config/env.config';

import type { ConfigType } from '@nestjs/config';

/**
 * Authenticates customer systems.
 *
 * A single shared API key is the v1 model, so `customerId` is taken from the
 * request rather than derived from the caller. Per-customer keys are required
 * before this is genuinely multi-tenant - see the known gaps in the README.
 */
@Injectable()
export class AuthService {
  constructor(
    @Inject(envConfig.KEY)
    private readonly config: ConfigType<typeof envConfig>,
  ) {}

  validateApiKey(apiKey: string): boolean {
    return this.config.auth.apiKey === apiKey;
  }
}
