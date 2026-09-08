import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { HeaderAPIKeyStrategy } from 'passport-headerapikey';

import { AuthService } from '../services';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(HeaderAPIKeyStrategy, 'x-api-key') {
  constructor(private authService: AuthService) {
    // @nestjs/passport 12 supplies the verify callback itself and delegates to
    // `validate` below, so it is no longer passed to `super`.
    super({ header: 'x-api-key', prefix: '' }, false);
  }

  validate(apiKey: string): boolean {
    if (!this.authService.validateApiKey(apiKey)) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
