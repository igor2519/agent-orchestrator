import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { RequireApiKey } from '../../auth/decorators';
import { ValidationErrorDto } from '../../common/dto/validation-error.dto';
import { JoiValidationPipe } from '../../common/pipes';
import { CustomerSettings } from '../entities/customer-settings.entity';
import { updateCustomerSettingsSchema } from '../joi-validations';
import { CustomerSettingsService } from '../services/customer-settings.service';

import type { UpdateCustomerSettingsInput } from '../joi-validations';

@ApiTags('Customer settings')
@Controller('customers/:customerId/settings')
export class CustomerSettingsController {
  constructor(private readonly settingsService: CustomerSettingsService) {}

  @ApiOperation({
    summary: 'Read notification settings',
    description: 'Returns WEBSOCKET defaults for a customer that has never configured any.',
  })
  @RequireApiKey()
  @Get()
  get(@Param('customerId') customerId: string): Promise<CustomerSettings> {
    return this.settingsService.get(customerId);
  }

  @ApiOperation({ summary: 'Set the webhook URL and notification mode' })
  @RequireApiKey()
  @Put()
  update(
    @Param('customerId') customerId: string,
    @Body(new JoiValidationPipe(updateCustomerSettingsSchema)) body: UpdateCustomerSettingsInput,
  ): Promise<CustomerSettings> {
    return this.settingsService.update(customerId, body);
  }
}

/** Documented so the generated client exposes the error shape. */
export type { ValidationErrorDto };
