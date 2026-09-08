import { TransactionalRepository } from '@app/messaging';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { CustomerSettings } from './entities/customer-settings.entity';

import type { DeepPartial, EntityManager } from 'typeorm';

@Injectable()
export class CustomerSettingsRepository extends TransactionalRepository<CustomerSettings> {
  constructor(@InjectDataSource() dataSource: DataSource) {
    super(CustomerSettings, dataSource);
  }

  findByCustomer(customerId: string, manager?: EntityManager): Promise<CustomerSettings | null> {
    return this.scoped(manager).findOne({ where: { customerId } });
  }

  /** Insert-or-update on the natural key, so callers need not check first. */
  async upsert(settings: DeepPartial<CustomerSettings>): Promise<CustomerSettings> {
    const repository = this.scoped();

    await repository.upsert(repository.create(settings), ['customerId']);

    return repository.findOneOrFail({ where: { customerId: settings.customerId } });
  }
}
