import { DocumentStatus } from '@app/contracts';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';

import { AuditAction, AuditActor } from '../constants/audit-action';

import { AuditService } from './audit.service';

import type {
  AuditEntryData,
  AuditEventsRepository,
} from '../repositories/audit-events.repository';
import type { EntityManager } from 'typeorm';

describe('AuditService', () => {
  const manager = {} as EntityManager;
  let appended: Array<{ manager: EntityManager; entry: AuditEntryData }>;
  let repository: AuditEventsRepository;
  let service: AuditService;

  beforeEach(() => {
    appended = [];
    repository = {
      append: jest.fn((m: EntityManager, entry: AuditEntryData) => {
        appended.push({ manager: m, entry });

        return Promise.resolve();
      }),
      findForDocument: jest.fn(() => Promise.resolve([])),
    } as unknown as AuditEventsRepository;
    service = new AuditService(repository);
  });

  const base = {
    documentId: '11111111-1111-4111-8111-111111111111',
    customerId: 'customer-alpha',
    correlationId: '22222222-2222-4222-8222-222222222222',
    action: AuditAction.DocumentSubmitted,
    actor: AuditActor.Api,
  };

  it('writes through the caller transaction so the entry commits with the change', async () => {
    await service.record(manager, base);

    expect(appended).toHaveLength(1);
    expect(appended[0].manager).toBe(manager);
  });

  it('records the transition it was given', async () => {
    await service.record(manager, {
      ...base,
      action: AuditAction.StatusChanged,
      actor: AuditActor.Pipeline,
      fromStatus: DocumentStatus.Received,
      toStatus: DocumentStatus.Validated,
    });

    expect(appended[0].entry).toMatchObject({
      action: AuditAction.StatusChanged,
      actor: AuditActor.Pipeline,
      fromStatus: DocumentStatus.Received,
      toStatus: DocumentStatus.Validated,
    });
  });

  it('normalises every omitted optional to null rather than leaving it undefined', async () => {
    await service.record(manager, base);

    expect(appended[0].entry).toMatchObject({
      fromStatus: null,
      toStatus: null,
      eventType: null,
      eventId: null,
      attempt: null,
      detail: null,
    });
  });

  it('never exposes a way to change an entry once written', () => {
    // The guarantee is only worth as much as the absence of an escape hatch.
    expect(Object.getOwnPropertyNames(AuditService.prototype).sort()).toStrictEqual([
      'constructor',
      'findForDocument',
      'record',
    ]);
  });

  it('reports a document with no history as not found', async () => {
    await expect(service.findForDocument(base.documentId)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
