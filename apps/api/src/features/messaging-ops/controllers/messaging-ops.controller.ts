import { MessagingOpsService } from '@app/messaging';
import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JoiValidationPipe } from 'src/features/common/pipes';

import { InboxEntryDto, OutboxStatsDto, PendingOutboxMessageDto } from '../dto';
import { eventIdParamSchema, pendingOutboxQuerySchema } from '../joi-validations';

/**
 * Operational view of the API's own inbox and outbox.
 *
 * The worker services serve no HTTP, so this reports on the API only; their queues
 * and dead-letter queues are inspected through the RabbitMQ management UI.
 */
@ApiTags('Messaging')
@Controller('messaging')
export class MessagingOpsController {
  constructor(private readonly opsService: MessagingOpsService) {}

  @ApiOperation({ summary: 'Counts of pending vs published outbox rows' })
  @ApiOkResponse({ type: OutboxStatsDto })
  @Get('outbox/stats')
  outboxStats(): Promise<OutboxStatsDto> {
    return this.opsService.outboxStats();
  }

  @ApiOperation({ summary: 'Outbox rows still awaiting publication' })
  @ApiOkResponse({ type: [PendingOutboxMessageDto] })
  @Get('outbox/pending')
  async pendingOutbox(
    @Query(new JoiValidationPipe(pendingOutboxQuerySchema)) query: { limit: number },
  ): Promise<PendingOutboxMessageDto[]> {
    const messages = await this.opsService.pendingOutbox(query.limit);

    return messages.map((message) => ({
      id: message.id,
      documentId: message.documentId,
      type: message.type,
      routingKey: message.routingKey,
      correlationId: message.correlationId,
      availableAt: message.availableAt,
      attempts: message.attempts,
      lastError: message.lastError,
      createdAt: message.createdAt,
    }));
  }

  @ApiOperation({ summary: 'Whether this service has already consumed an event' })
  @ApiOkResponse({ type: InboxEntryDto })
  @Get('inbox/:eventId')
  async inboxEntry(
    @Param(new JoiValidationPipe(eventIdParamSchema)) params: { eventId: string },
  ): Promise<InboxEntryDto> {
    const entry = await this.opsService.inboxEntry(params.eventId);

    return {
      eventId: entry.eventId,
      processed: entry.processed,
      consumers: entry.entries.map((record) => record.consumer),
    };
  }
}
