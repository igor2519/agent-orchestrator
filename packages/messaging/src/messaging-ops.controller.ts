import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DataSource, IsNull, Not } from 'typeorm';

import { InboxMessage } from './inbox/inbox-message.entity';
import { OutboxMessage } from './outbox/outbox-message.entity';

/**
 * Operational view of this service's own inbox and outbox.
 *
 * Mounted identically in every service so an operator can answer "is anything
 * stuck here?" without a database session: unpublished outbox rows are events the
 * service decided but has not yet managed to emit.
 */
@ApiTags('Messaging')
@Controller('messaging')
export class MessagingOpsController {
  constructor(private readonly dataSource: DataSource) {}

  @ApiOperation({ summary: 'Counts of pending vs published outbox rows' })
  @Get('outbox/stats')
  async outboxStats() {
    const [pending, published, failing] = await Promise.all([
      this.dataSource.manager.count(OutboxMessage, { where: { publishedAt: IsNull() } }),
      this.dataSource.manager.count(OutboxMessage, { where: { publishedAt: Not(IsNull()) } }),
      this.dataSource.manager.count(OutboxMessage, {
        where: { publishedAt: IsNull(), lastError: Not(IsNull()) },
      }),
    ]);

    return { pending, published, failing };
  }

  @ApiOperation({ summary: 'Outbox rows still awaiting publication' })
  @Get('outbox/pending')
  async pendingOutbox(@Query('limit') limit = '50') {
    return this.dataSource.manager.find(OutboxMessage, {
      where: { publishedAt: IsNull() },
      order: { sequence: 'ASC' },
      take: Math.min(Number(limit) || 50, 200),
    });
  }

  @ApiOperation({ summary: 'Events this service has already consumed' })
  @Get('inbox/:eventId')
  async inboxEntry(@Param('eventId') eventId: string) {
    const entries = await this.dataSource.manager.find(InboxMessage, { where: { eventId } });

    return { eventId, processed: entries.length > 0, entries };
  }
}
