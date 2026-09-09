import { DocumentStatus } from '@app/contracts';
import { ApiProperty } from '@nestjs/swagger';

import { PaginationQueryDto } from 'src/features/common/dto';

export class ListDocumentsQueryDto extends PaginationQueryDto {
  @ApiProperty({ required: false })
  customerId?: string;

  @ApiProperty({ required: false, enum: DocumentStatus, enumName: 'DocumentStatus' })
  status?: DocumentStatus;

  // Documented as an ISO-8601 string, which is what callers send, but typed as the
  // Date the Joi pipe has already parsed by the time a handler sees it.
  @ApiProperty({
    required: false,
    type: String,
    format: 'date-time',
    description: 'ISO-8601 lower bound on submission time',
  })
  submittedFrom?: Date;

  @ApiProperty({
    required: false,
    type: String,
    format: 'date-time',
    description: 'ISO-8601 upper bound on submission time',
  })
  submittedTo?: Date;
}
