import { EventType } from '@app/contracts';
import { MessageController, OnEvent } from '@app/messaging';
import { Injectable } from '@nestjs/common';

import { OcrService } from '../services/ocr.service';

import type { EventContext } from '@app/messaging';

/**
 * RabbitMQ endpoints of the OCR service.
 *
 * The controller only declares what it subscribes to and delegates; all decisions
 * live in {@link OcrService}.
 */
@MessageController()
@Injectable()
export class OcrEventsController {
  constructor(private readonly ocrService: OcrService) {}

  @OnEvent(EventType.DocumentSubmitted)
  async onDocumentSubmitted(context: EventContext): Promise<void> {
    await this.ocrService.handleDocumentSubmitted(context);
  }
}
