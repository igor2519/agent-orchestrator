import { ApiProperty } from '@nestjs/swagger';

export class SubmitDocumentDto {
  @ApiProperty({ example: 'customer-alpha' })
  customerId: string;

  @ApiProperty({ example: 'INV-2026-000123', description: 'Synthetic document reference' })
  documentReference: string;

  @ApiProperty({ example: 'invoice' })
  documentType: string;

  @ApiProperty({
    selfRequired: false,
    type: 'object',
    additionalProperties: true,
    description: 'Inline synthetic payload. Provide either this or payloadUri.',
  })
  payload?: Record<string, unknown>;

  @ApiProperty({ required: false, description: 'Provide either this or payload.' })
  payloadUri?: string;

  @ApiProperty({ example: 'https://example.test/webhooks/documents' })
  callbackUrl: string;
}
