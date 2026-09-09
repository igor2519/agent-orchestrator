import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { JoiValidationPipe } from 'src/features/common/pipes';

import { listCallbacksQuerySchema, receivedCallbackSchema } from '../joi-validations';
import { MockReceiverService } from '../services/mock-receiver.service';

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
  constructor(private readonly mockReceiverService: MockReceiverService) {}

  @ApiOperation({ summary: 'Accept a webhook as a customer system would' })
  @HttpCode(HttpStatus.OK)
  @Post()
  receive(
    @Body(new JoiValidationPipe(receivedCallbackSchema)) body: Record<string, unknown>,
    @Headers('x-signature') signature?: string,
    @Headers('x-timestamp') timestamp?: string,
  ) {
    return this.mockReceiverService.receive(body, signature, timestamp);
  }

  @ApiOperation({ summary: 'Inspect callbacks this receiver has accepted' })
  @Get()
  list(@Query(new JoiValidationPipe(listCallbacksQuerySchema)) query: { documentId?: string }) {
    return this.mockReceiverService.list(query.documentId);
  }
}
