import { PermanentError } from '@app/messaging';
import { Inject, Injectable } from '@nestjs/common';

import { BaseDocumentProcessor } from './base-document-processor';
import { DOCUMENT_PROCESSORS } from './processing.tokens';

@Injectable()
export class DocumentProcessorRegistry {
  constructor(@Inject(DOCUMENT_PROCESSORS) private readonly processors: BaseDocumentProcessor[]) {}

  resolve(documentType: string): BaseDocumentProcessor {
    const processor = this.processors.find((candidate) => candidate.supports(documentType));

    if (!processor) {
      throw new PermanentError(
        `No processor supports document type "${documentType}"`,
        'NO_PROCESSOR',
      );
    }

    return processor;
  }

  get registered(): string[] {
    return this.processors.map((processor) => processor.name);
  }
}
