import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CustomerSettingsModule } from 'src/features/customer-settings/customer-settings.module';

import { DocumentsController } from './documents.controller';
import { DocumentsGateway } from './documents.gateway';
import { Document } from './entities/document.entity';
import { IdempotencyKey } from './entities/idempotency-key.entity';
import { DocumentsRepository } from './repositories/documents.repository';
import { IdempotencyKeysRepository } from './repositories/idempotency-keys.repository';
import { ContentHashService } from './services/content-hash.service';
import { DocumentProjectionService } from './services/document-projection.service';
import { DocumentStreamService } from './services/document-stream.service';
import { DocumentTicketService } from './services/document-ticket.service';
import { DocumentsService } from './services/documents.service';

@Module({
  imports: [TypeOrmModule.forFeature([Document, IdempotencyKey]), CustomerSettingsModule],
  controllers: [DocumentsController],
  providers: [
    DocumentsRepository,
    IdempotencyKeysRepository,
    ContentHashService,
    DocumentsService,
    DocumentProjectionService,
    DocumentStreamService,
    DocumentTicketService,
    DocumentsGateway,
  ],
  exports: [
    DocumentsService,
    DocumentProjectionService,
    DocumentStreamService,
    DocumentTicketService,
    DocumentsGateway,
    DocumentsRepository,
  ],
})
export class DocumentsModule {}
