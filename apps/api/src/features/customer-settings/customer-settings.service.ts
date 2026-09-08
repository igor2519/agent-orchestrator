import { NotificationMode } from '@app/contracts';
import { Injectable } from '@nestjs/common';

import { CustomerSettingsRepository } from './customer-settings.repository';

import type { CustomerSettings } from './entities/customer-settings.entity';
import type { UpdateCustomerSettingsInput } from './joi-validations';

/**
 * Notification preferences, with a safe default for customers who never set any.
 *
 * WebSocket is the default because it needs no configuration and cannot be
 * misdirected; webhooks only start once a customer has supplied a target.
 */
@Injectable()
export class CustomerSettingsService {
  constructor(private readonly repository: CustomerSettingsRepository) {}

  async get(customerId: string): Promise<CustomerSettings> {
    const stored = await this.repository.findByCustomer(customerId);

    return (
      stored ?? {
        customerId,
        callbackUrl: null,
        notificationMode: NotificationMode.Websocket,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );
  }

  update(customerId: string, input: UpdateCustomerSettingsInput): Promise<CustomerSettings> {
    return this.repository.upsert({
      customerId,
      // An empty string from a cleared form field means "no callback".
      callbackUrl: input.callbackUrl?.trim() ? input.callbackUrl.trim() : null,
      notificationMode: input.notificationMode,
    });
  }
}
