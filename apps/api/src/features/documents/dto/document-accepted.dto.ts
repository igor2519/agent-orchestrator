import { DocumentStatus } from '@app/contracts';
import { ApiProperty } from '@nestjs/swagger';

export class DocumentAcceptedDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: DocumentStatus, enumName: 'DocumentStatus' })
  status: DocumentStatus;

  @ApiProperty()
  correlationId: string;

  @ApiProperty({
    description: 'True when an existing document was returned for a repeated Idempotency-Key',
  })
  duplicate: boolean;
}
