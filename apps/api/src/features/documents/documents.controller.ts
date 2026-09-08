import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Sse,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { map } from 'rxjs';

import { RequireApiKey } from '../auth/decorators';
import { ApiOkResponsePaginated } from '../common/decorators/api-ok-response-paginated.decorator';
import { ErrorDto } from '../common/dto/error.dto';
import { ValidationErrorDto } from '../common/dto/validation-error.dto';
import { JoiValidationPipe } from '../common/pipes';

import { DocumentAcceptedDto, ListDocumentsQueryDto, SubmitDocumentDto } from './dto';
import { Document } from './entities/document.entity';
import { listDocumentsSchema, submitDocumentSchema } from './joi-validations';
import { DocumentStreamService } from './services/document-stream.service';
import { DocumentTicketService } from './services/document-ticket.service';
import { DocumentsService } from './services/documents.service';

import type { ListDocumentsInput } from './joi-validations';
import type { MessageEvent } from '@nestjs/common';
import type { Observable } from 'rxjs';

const IDEMPOTENCY_HEADER = 'idempotency-key';

@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly stream: DocumentStreamService,
    private readonly tickets: DocumentTicketService,
  ) {}

  @ApiOperation({
    summary: 'Mint a short-lived ticket for a WebSocket connection',
    description:
      'A browser WebSocket cannot send headers, so a server-side caller exchanges its ' +
      'API key for a signed ticket that expires in a minute.',
  })
  @RequireApiKey()
  @HttpCode(HttpStatus.OK)
  @Post('stream/ticket')
  issueStreamTicket(): { ticket: string; expiresAt: string } {
    return this.tickets.issue();
  }

  @ApiOperation({
    summary: 'Submit a document for processing',
    description:
      'Persists the document and publishes DocumentSubmitted in one transaction. ' +
      'Repeating a request with the same Idempotency-Key returns the original document ' +
      'instead of starting a second flow.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'Client-generated key, unique per logical submission',
  })
  @ApiBadRequestResponse({ type: () => ValidationErrorDto })
  @ApiConflictResponse({ type: () => ErrorDto, description: 'Key reused with a different body' })
  @RequireApiKey()
  @HttpCode(HttpStatus.ACCEPTED)
  @Post()
  submit(
    @Body(new JoiValidationPipe(submitDocumentSchema)) body: SubmitDocumentDto,
    @Headers(IDEMPOTENCY_HEADER) idempotencyKey?: string,
  ): Promise<DocumentAcceptedDto> {
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    return this.documentsService.submit(body, idempotencyKey.trim());
  }

  @ApiOperation({
    summary: 'Live stream of document status changes',
    description:
      'Server-sent events mirroring the webhooks delivered to customer endpoints. ' +
      'Browsers cannot receive webhooks, so a UI watches this instead; the document ' +
      'itself remains the source of truth.',
  })
  @RequireApiKey()
  @Sse('stream')
  streamEvents(): Observable<MessageEvent> {
    return this.stream.asObservable().pipe(map((event) => ({ data: event })));
  }

  @ApiOperation({ summary: 'Fetch a document with its status, results and errors' })
  @ApiNotFoundResponse({ type: () => ErrorDto })
  @RequireApiKey()
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Document> {
    return this.documentsService.findOne(id);
  }

  @ApiOperation({ summary: 'List documents filtered by customer, status and submission date' })
  @ApiOkResponsePaginated(Document)
  @RequireApiKey()
  @Get()
  list(@Query(new JoiValidationPipe(listDocumentsSchema)) query: ListDocumentsQueryDto) {
    return this.documentsService.list(query as unknown as ListDocumentsInput);
  }

  @ApiOperation({
    summary: 'Retry a failed document',
    description: 'Re-publishes DocumentSubmitted so the whole flow runs again.',
  })
  @ApiBadRequestResponse({ type: () => ErrorDto, description: 'Document is not in FAILED state' })
  @ApiNotFoundResponse({ type: () => ErrorDto })
  @RequireApiKey()
  @HttpCode(HttpStatus.ACCEPTED)
  @Post(':id/retry')
  retry(@Param('id', ParseUUIDPipe) id: string): Promise<DocumentAcceptedDto> {
    return this.documentsService.retry(id);
  }
}
