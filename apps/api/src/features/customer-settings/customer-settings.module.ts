import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomerSettingsController } from './customer-settings.controller';
import { CustomerSettingsRepository } from './customer-settings.repository';
import { CustomerSettingsService } from './customer-settings.service';
import { CustomerSettings } from './entities/customer-settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerSettings])],
  controllers: [CustomerSettingsController],
  providers: [CustomerSettingsRepository, CustomerSettingsService],
  exports: [CustomerSettingsService, CustomerSettingsRepository],
})
export class CustomerSettingsModule {}
