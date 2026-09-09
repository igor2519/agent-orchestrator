import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditEvent } from './entities/audit-event.entity';
import { AuditEventsRepository } from './repositories/audit-events.repository';
import { AuditService } from './services/audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditEvent])],
  providers: [AuditEventsRepository, AuditService],
  exports: [AuditService],
})
export class AuditModule {}
