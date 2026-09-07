import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import envConfig from 'src/config/env.config';

import type { JwtSignOptions } from '@nestjs/jwt';

@Injectable()
export class JwtOtpService extends JwtService {
  constructor(
    @Inject(envConfig.KEY)
    config: ConfigType<typeof envConfig>,
  ) {
    super({
      secret: config.auth.otpJwtSecret,
      // the duration comes from the environment as a plain string (eg. '15m')
      signOptions: {
        expiresIn: config.auth.otpTokenDuration as JwtSignOptions['expiresIn'],
      },
    });
  }
}
