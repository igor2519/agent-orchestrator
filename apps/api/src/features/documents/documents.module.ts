import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentsController } from './documents.controller';
import { Document } from './entities/document.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { DocumentsRepository } from './repositories/documents.repository';
import { IdempotencyKeysRepository } from './repositories/idempotency-keys.repository';
import { DocumentProjectionService } from './services/document-projection.service';
import { DocumentsService } from './services/documents.service';

@Module({
  imports: [TypeOrmModule.forFeature([Document, IdempotencyKey])],
  controllers: [DocumentsController],
  providers: [
    DocumentsRepository,
    IdempotencyKeysRepository,
    DocumentsService,
    DocumentProjectionService,
  ],
  exports: [DocumentsService, DocumentProjectionService, DocumentsRepository],
})
export class DocumentsModule {}
