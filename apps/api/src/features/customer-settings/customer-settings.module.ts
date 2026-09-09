import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomerSettingsController } from './controllers/customer-settings.controller';
import { CustomerSettings } from './entities/customer-settings.entity';
import { CustomerSettingsRepository } from './repositories/customer-settings.repository';
import { CustomerSettingsService } from './services/customer-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerSettings])],
  controllers: [CustomerSettingsController],
  providers: [CustomerSettingsRepository, CustomerSettingsService],
  exports: [CustomerSettingsService, CustomerSettingsRepository],
})
export class CustomerSettingsModule {}
