import { ApiProperty } from '@nestjs/swagger';

/**
 * Response contracts for the operations endpoints.
 *
 * These deliberately do not re-export the messaging package's entities: a
 * controller's published shape is part of the API's contract, and leaking another
 * package's persistence model into it would couple the two and also make the
 * Swagger plugin emit a runtime import into that package's sources.
 */
export class OutboxStatsDto {
  @ApiProperty({ description: 'Rows decided but not yet published' })
  pending: number;

  @ApiProperty()
  published: number;

  @ApiProperty({ description: 'Pending rows whose last publish attempt failed' })
  failing: number;
}

export class PendingOutboxMessageDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  documentId: string;

  @ApiProperty()
  type: string;

  @ApiProperty()
  routingKey: string;

  @ApiProperty()
  correlationId: string;

  @ApiProperty()
  availableAt: Date;

  @ApiProperty()
  attempts: number;

  @ApiProperty({ required: false, nullable: true })
  lastError: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class InboxEntryDto {
  @ApiProperty()
  eventId: string;

  @ApiProperty()
  processed: boolean;

  @ApiProperty({ type: [String], description: 'Queues that have consumed this event' })
  consumers: string[];
}
