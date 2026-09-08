import { DocumentStatus } from '@app/contracts';
import { ApiProperty } from '@nestjs/swagger';

import { PaginationQueryDto } from 'src/features/common/dto';

export class ListDocumentsQueryDto extends PaginationQueryDto {
  @ApiProperty({ required: false })
  customerId?: string;

  @ApiProperty({ required: false, enum: DocumentStatus, enumName: 'DocumentStatus' })
  status?: DocumentStatus;

  @ApiProperty({ required: false, description: 'ISO-8601 lower bound on submission time' })
  submittedFrom?: string;

  @ApiProperty({ required: false, description: 'ISO-8601 upper bound on submission time' })
  submittedTo?: string;
}
