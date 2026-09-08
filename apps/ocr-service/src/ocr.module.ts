import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { OcrResult } from './entities/ocr-result.entity';
import { BaseOcrProcessor } from './ocr/base-ocr-processor';
import { OcrProcessorRegistry } from './ocr/ocr-processor.registry';
import { OCR_PROCESSORS } from './ocr/ocr.tokens';
import { DeterministicOcrProcessor } from './ocr/processors/deterministic-ocr.processor';
import { PdfTextProcessor } from './ocr/processors/pdf-text.processor';
import { PlainTextProcessor } from './ocr/processors/plain-text.processor';
import { TesseractOcrProcessor } from './ocr/processors/tesseract-ocr.processor';
import { WordTextProcessor } from './ocr/processors/word-text.processor';
import { OcrResultsRepository } from './repositories/ocr-results.repository';
import { OcrService } from './services/ocr.service';
import { BaseDocumentValidator } from './validation/base-document-validator';
import { DocumentValidatorRegistry } from './validation/document-validator.registry';
import { DOCUMENT_VALIDATORS } from './validation/validation.tokens';
import { ExtractedTextValidator } from './validation/validators/extracted-text.validator';
import { HtmlContentValidator } from './validation/validators/html-content.validator';
import { InvoiceFieldsValidator } from './validation/validators/invoice-fields.validator';

/**
 * Extension points of this service.
 *
 * Adding an OCR engine or a validation rule means writing a class and adding it
 * to one of the two lists below. No handler, event or queue definition changes.
 * Order is precedence, so general-purpose engines belong last.
 */
/*
 * Order is precedence. Each format goes to the engine that reads it exactly;
 * Tesseract handles images, where recognition is genuinely required, and the
 * deterministic engine remains the fallback for synthetic document types.
 */
const OCR_PROCESSOR_CLASSES = [
  PlainTextProcessor,
  PdfTextProcessor,
  WordTextProcessor,
  TesseractOcrProcessor,
  DeterministicOcrProcessor,
];
const DOCUMENT_VALIDATOR_CLASSES = [
  ExtractedTextValidator,
  HtmlContentValidator,
  InvoiceFieldsValidator,
];

@Module({
  imports: [TypeOrmModule.forFeature([OcrResult])],
  providers: [
    ...OCR_PROCESSOR_CLASSES,
    ...DOCUMENT_VALIDATOR_CLASSES,
    {
      provide: OCR_PROCESSORS,
      useFactory: (...processors: BaseOcrProcessor[]) => processors,
      inject: OCR_PROCESSOR_CLASSES,
    },
    {
      provide: DOCUMENT_VALIDATORS,
      useFactory: (...validators: BaseDocumentValidator[]) => validators,
      inject: DOCUMENT_VALIDATOR_CLASSES,
    },
    OcrProcessorRegistry,
    DocumentValidatorRegistry,
    OcrResultsRepository,
    OcrService,
  ],
  exports: [
    OcrProcessorRegistry,
    DocumentValidatorRegistry,
    OcrResultsRepository,
    OcrService,
    TypeOrmModule,
  ],
})
export class OcrModule {}
