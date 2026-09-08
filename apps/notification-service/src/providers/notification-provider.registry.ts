import { Inject, Injectable } from '@nestjs/common';

import { BaseNotificationProvider } from './base-notification-provider';

import type { NotificationCandidate, NotificationChannel } from './base-notification-provider';

export const NOTIFICATION_PROVIDERS = Symbol('NOTIFICATION_PROVIDERS');

@Injectable()
export class NotificationProviderRegistry {
  constructor(
    @Inject(NOTIFICATION_PROVIDERS) private readonly providers: BaseNotificationProvider[],
  ) {}

  /** Every channel that can carry this notification; intake creates one delivery per channel. */
  applicableTo(candidate: NotificationCandidate): BaseNotificationProvider[] {
    return this.providers.filter((provider) => provider.supports(candidate));
  }

  byChannel(channel: NotificationChannel): BaseNotificationProvider | undefined {
    return this.providers.find((provider) => provider.channel === channel);
  }

  get channels(): NotificationChannel[] {
    return this.providers.map((provider) => provider.channel);
  }
}
