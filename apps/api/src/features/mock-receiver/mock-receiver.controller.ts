import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { ReceivedCallback } from './received-callback.entity';
import { WebhookSignatureService } from './webhook-signature.service';

/**
 * Stand-in for a customer's webhook endpoint.
 *
 * It lives in the API service because that is the only service exposing HTTP; the
 * notification service delivers to it over the network exactly as it would to a
 * real customer, signature included.
 */
@ApiTags('Mock receiver')
@Controller('mock/callbacks')
export class MockReceiverController {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly signatures: WebhookSignatureService,
  ) {}

  @ApiOperation({ summary: 'Accept a webhook as a customer system would' })
  @HttpCode(HttpStatus.OK)
  @Post()
  async receive(
    @Body() body: Record<string, unknown>,
    @Headers('x-signature') signature?: string,
    @Headers('x-timestamp') timestamp?: string,
  ) {
    const raw = JSON.stringify(body);
    const provided = signature?.replace(/^sha256=/, '') ?? '';
    const signatureValid = Boolean(timestamp) && this.signatures.verify(raw, timestamp!, provided);

    await this.dataSource.manager.save(
      ReceivedCallback,
      this.dataSource.manager.create(ReceivedCallback, {
        documentId: (body.documentId as string | undefined) ?? null,
        correlationId: (body.correlationId as string | undefined) ?? null,
        eventType: (body.event as string | undefined) ?? null,
        signatureValid,
        body,
      }),
    );

    return { received: true, signatureValid };
  }

  @ApiOperation({ summary: 'Inspect callbacks this receiver has accepted' })
  @Get()
  async list(@Query('documentId') documentId?: string) {
    return this.dataSource.manager.find(ReceivedCallback, {
      where: documentId ? { documentId } : {},
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
