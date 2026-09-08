import { DocumentStatus } from '@app/contracts';
import { ApiProperty } from '@nestjs/swagger';

export class DocumentAcceptedDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: DocumentStatus, enumName: 'DocumentStatus' })
  status: DocumentStatus;

  @ApiProperty()
  correlationId: string;

  @ApiProperty({ description: 'True when an existing document was returned instead of a new one' })
  duplicate: boolean;

  @ApiProperty({
    required: false,
    enum: ['IDEMPOTENCY_KEY', 'CONTENT_HASH'],
    description:
      'Which check matched: a repeated Idempotency-Key, or content already processed for this customer',
  })
  deduplicatedBy?: 'IDEMPOTENCY_KEY' | 'CONTENT_HASH';
}
