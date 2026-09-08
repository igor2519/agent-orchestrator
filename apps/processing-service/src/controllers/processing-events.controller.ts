import { EventType } from '@app/contracts';
import { MessageController, OnEvent } from '@app/messaging';
import { Injectable } from '@nestjs/common';

import { ProcessingService } from '../services/processing.service';

import type { EventContext } from '@app/messaging';

/**
 * RabbitMQ endpoints of the processing service.
 *
 * Declares the subscription and delegates; all decisions live in
 * {@link ProcessingService}.
 */
@MessageController()
@Injectable()
export class ProcessingEventsController {
  constructor(private readonly processingService: ProcessingService) {}

  @OnEvent(EventType.DocumentValidated)
  async onDocumentValidated(context: EventContext): Promise<void> {
    await this.processingService.handleDocumentValidated(context);
  }
}
