import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProcessingResult } from './entities/processing-result.entity';
import { BaseDocumentProcessor } from './processing/base-document-processor';
import { DocumentProcessorRegistry } from './processing/document-processor.registry';
import { DOCUMENT_PROCESSORS } from './processing/processing.tokens';
import { DeterministicDocumentProcessor } from './processing/processors/deterministic-document.processor';

/**
 * The extension point of this service: add a processor class to the list and it
 * participates immediately. Order is precedence, so a type-specific processor
 * belongs before a catch-all.
 */
const DOCUMENT_PROCESSOR_CLASSES = [DeterministicDocumentProcessor];

@Module({
  imports: [TypeOrmModule.forFeature([ProcessingResult])],
  providers: [
    ...DOCUMENT_PROCESSOR_CLASSES,
    {
      provide: DOCUMENT_PROCESSORS,
      useFactory: (...processors: BaseDocumentProcessor[]) => processors,
      inject: DOCUMENT_PROCESSOR_CLASSES,
    },
    DocumentProcessorRegistry,
  ],
  exports: [DocumentProcessorRegistry, TypeOrmModule],
})
export class ProcessingModule {}
